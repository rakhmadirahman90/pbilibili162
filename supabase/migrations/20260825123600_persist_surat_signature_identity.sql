-- Persist and protect Ketua/Sekretaris signatures for surat.
-- Prevents a save/refresh cycle from replacing valid signatures with empty strings.

create or replace function public.persist_surat_signature_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  master_ketua text;
  master_sekretaris text;
begin
  select ttd_ketua_url, ttd_sekretaris_url
    into master_ketua, master_sekretaris
  from public.arsip_surat
  where nomor_surat = '__MASTER_DIGITAL_ASSETS__'
  order by updated_at desc nulls last
  limit 1;

  if coalesce(trim(new.ttd_ketua_url), '') = '' then
    if tg_op = 'UPDATE' and coalesce(trim(old.ttd_ketua_url), '') <> '' then
      new.ttd_ketua_url := old.ttd_ketua_url;
    elsif coalesce(trim(master_ketua), '') <> '' then
      new.ttd_ketua_url := master_ketua;
    end if;
  end if;

  if coalesce(trim(new.ttd_sekretaris_url), '') = '' then
    if tg_op = 'UPDATE' and coalesce(trim(old.ttd_sekretaris_url), '') <> '' then
      new.ttd_sekretaris_url := old.ttd_sekretaris_url;
    elsif coalesce(trim(master_sekretaris), '') <> '' then
      new.ttd_sekretaris_url := master_sekretaris;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_persist_surat_signature_identity on public.arsip_surat;
create trigger trg_persist_surat_signature_identity
before insert or update of ttd_ketua_url, ttd_sekretaris_url on public.arsip_surat
for each row execute function public.persist_surat_signature_identity();

create or replace function public.sync_surat_identity_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.nomor_surat = '__MASTER_DIGITAL_ASSETS__' then
    update public.pengaturan_surat
      set ttd_ketua_url = new.ttd_ketua_url,
          ttd_sekretaris_url = new.ttd_sekretaris_url,
          nama_ketua = coalesce(nullif(new.nama_ketua,''), nama_ketua),
          nama_sekretaris = coalesce(nullif(new.nama_sekretaris,''), nama_sekretaris),
          updated_at = now()
      where id = 1;

    update public.site_settings
      set value = value || jsonb_build_object(
        'ttd_ketua_url', new.ttd_ketua_url,
        'ttd_sekretaris_url', new.ttd_sekretaris_url,
        'nama_ketua', new.nama_ketua,
        'nama_sekretaris', new.nama_sekretaris,
        'updated_at', now()
      ), updated_at = now()
      where key = 'digital_assets_surat';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_surat_identity_settings on public.arsip_surat;
create trigger trg_sync_surat_identity_settings
after insert or update of ttd_ketua_url, ttd_sekretaris_url, nama_ketua, nama_sekretaris on public.arsip_surat
for each row execute function public.sync_surat_identity_settings();
