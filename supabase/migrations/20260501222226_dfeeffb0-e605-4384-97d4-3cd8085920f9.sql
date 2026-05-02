-- Lock down SECURITY DEFINER functions: revoke from public/anon, grant only authenticated
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.has_any_role(uuid, public.app_role[]) from public, anon;
revoke execute on function public.is_project_member(uuid, uuid) from public, anon;
revoke execute on function public.set_updated_at() from public, anon;
revoke execute on function public.handle_new_user() from public, anon;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.has_any_role(uuid, public.app_role[]) to authenticated;
grant execute on function public.is_project_member(uuid, uuid) to authenticated;