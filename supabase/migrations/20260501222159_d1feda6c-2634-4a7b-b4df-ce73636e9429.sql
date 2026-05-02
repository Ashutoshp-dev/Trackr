-- ROLES ENUM
create type public.app_role as enum ('admin', 'manager', 'member');
create type public.task_status as enum ('todo', 'in_progress', 'done');
create type public.task_priority as enum ('low', 'medium', 'high');

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- USER ROLES (separate table — never on profiles)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

-- has_role security definer (avoids RLS recursion)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.has_any_role(_user_id uuid, _roles public.app_role[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = any(_roles))
$$;

-- PROJECTS
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.projects enable row level security;

-- PROJECT MEMBERS
create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique(project_id, user_id)
);
alter table public.project_members enable row level security;

-- helper: is user member of project
create or replace function public.is_project_member(_user_id uuid, _project_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.project_members where user_id = _user_id and project_id = _project_id)
$$;

-- TASKS
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  assigned_to uuid references auth.users(id) on delete set null,
  due_date date,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tasks enable row level security;

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger tasks_updated_at before update on public.tasks
for each row execute function public.set_updated_at();

-- AUTO PROFILE + FIRST USER IS ADMIN
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare user_count int;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email);

  select count(*) into user_count from public.user_roles;
  if user_count = 0 then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'member');
  end if;
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ============ RLS POLICIES ============

-- PROFILES: anyone authenticated can view (needed to display assignee names); user updates own
create policy "profiles viewable by authenticated" on public.profiles
for select to authenticated using (true);
create policy "users update own profile" on public.profiles
for update to authenticated using (auth.uid() = id);

-- USER_ROLES: user views own; admin views all; admin manages
create policy "users view own role" on public.user_roles
for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "admins insert roles" on public.user_roles
for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "admins update roles" on public.user_roles
for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins delete roles" on public.user_roles
for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- PROJECTS
create policy "view projects: admin or member" on public.projects
for select to authenticated using (
  public.has_role(auth.uid(), 'admin')
  or public.is_project_member(auth.uid(), id)
  or created_by = auth.uid()
);
create policy "create projects: admin/manager" on public.projects
for insert to authenticated with check (
  public.has_any_role(auth.uid(), array['admin','manager']::public.app_role[])
  and created_by = auth.uid()
);
create policy "update projects: admin or creator" on public.projects
for update to authenticated using (
  public.has_role(auth.uid(), 'admin') or created_by = auth.uid()
);
create policy "delete projects: admin or creator" on public.projects
for delete to authenticated using (
  public.has_role(auth.uid(), 'admin') or created_by = auth.uid()
);

-- PROJECT_MEMBERS
create policy "view project_members" on public.project_members
for select to authenticated using (
  public.has_role(auth.uid(), 'admin')
  or user_id = auth.uid()
  or public.is_project_member(auth.uid(), project_id)
);
create policy "manage project_members: admin/manager" on public.project_members
for insert to authenticated with check (
  public.has_any_role(auth.uid(), array['admin','manager']::public.app_role[])
);
create policy "delete project_members: admin/manager" on public.project_members
for delete to authenticated using (
  public.has_any_role(auth.uid(), array['admin','manager']::public.app_role[])
);

-- TASKS
create policy "view tasks" on public.tasks
for select to authenticated using (
  public.has_role(auth.uid(), 'admin')
  or (public.has_role(auth.uid(), 'manager') and public.is_project_member(auth.uid(), project_id))
  or assigned_to = auth.uid()
  or created_by = auth.uid()
);
create policy "create tasks: admin/manager" on public.tasks
for insert to authenticated with check (
  public.has_any_role(auth.uid(), array['admin','manager']::public.app_role[])
  and created_by = auth.uid()
);
create policy "update tasks: admin/manager any; member own status" on public.tasks
for update to authenticated using (
  public.has_any_role(auth.uid(), array['admin','manager']::public.app_role[])
  or assigned_to = auth.uid()
);
create policy "delete tasks: admin/manager" on public.tasks
for delete to authenticated using (
  public.has_any_role(auth.uid(), array['admin','manager']::public.app_role[])
);