-- Vyro B-14: calificaciones. ratings ya tiene unique (ride_id, rater_id) y check rater <> ratee (B-01).
-- El promedio se recalcula desde ratings con la fila del perfil bloqueada (exacto, sin deriva de redondeo y serializado por calificado).
create function public.rate_ride(p_ride_id uuid, p_stars smallint, p_comment text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_ride public.rides;
  v_ratee uuid;
begin
  select * into v_ride from public.rides where id = p_ride_id;
  if not found then raise exception 'ride_not_found' using errcode = 'P0001'; end if;
  if v_uid is null or (v_uid is distinct from v_ride.passenger_id and v_uid is distinct from v_ride.driver_id) then -- ojo: driver_id puede ser null
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_ride.status <> 'completed' then raise exception 'ride_not_completed' using errcode = 'P0001'; end if;
  if p_stars is null or p_stars not between 1 and 5 or char_length(p_comment) > 280 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;
  if now() > v_ride.completed_at + interval '7 days' then
    raise exception 'rating_window_closed' using errcode = 'P0001';
  end if;

  v_ratee := case when v_uid = v_ride.passenger_id then v_ride.driver_id else v_ride.passenger_id end;
  perform 1 from public.profiles where id = v_ratee for update;
  begin
    insert into public.ratings (ride_id, rater_id, ratee_id, stars, comment) values (p_ride_id, v_uid, v_ratee, p_stars, p_comment);
  exception when unique_violation then
    raise exception 'already_rated' using errcode = 'P0001';
  end;
  update public.profiles p set (rating_avg, rating_count) =
    (select round(avg(stars), 2), count(*) from public.ratings where ratee_id = v_ratee)
  where p.id = v_ratee;
end $$;
revoke all on function public.rate_ride(uuid, smallint, text) from public, anon;
grant execute on function public.rate_ride(uuid, smallint, text) to authenticated;
