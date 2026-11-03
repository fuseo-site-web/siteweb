-- Bucket public des visuels du site (hero, etc.), WebP uniquement. Écriture réservée à la clé service role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-images', 'site-images', true, 5242880, array['image/webp'])
on conflict (id) do nothing;
