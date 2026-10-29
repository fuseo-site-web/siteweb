-- Lot 4 : l'utilisateur donne et retire lui-même son consentement « données de santé ».
-- Insertion uniquement pour soi et sans retrait ; seule la date de retrait est modifiable.
create policy health_consents_insert_own on public.health_consents
  for insert to authenticated
  with check (user_id = (select auth.uid()) and withdrawn_at is null);

create policy health_consents_update_own on public.health_consents
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant insert (user_id, policy_version, purpose) on public.health_consents to authenticated;
grant update (withdrawn_at) on public.health_consents to authenticated;
