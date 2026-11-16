-- Let a participant mark messages sent by the OTHER party as read (sets read_at).
-- Powers the "new messages" card on the dashboards.
drop policy if exists "messages recipient mark read" on public.messages;
create policy "messages recipient mark read" on public.messages
  for update
  using (sender_id <> auth.uid() and public.is_application_participant(application_id))
  with check (sender_id <> auth.uid() and public.is_application_participant(application_id));

create index if not exists messages_unread_idx on public.messages (application_id) where read_at is null;
