-- Social foundation schema for follows and favorites enhancements

-- Ensure schema exists for migrations directory usage
create schema if not exists public;

-- 1. Social follows table
create table if not exists public.social_follows (
    follower_id uuid not null references public.profiles(id) on delete cascade,
    followee_id uuid not null references public.profiles(id) on delete cascade,
    created_at timestamp with time zone not null default now(),
    constraint social_follows_pkey primary key (follower_id, followee_id),
    constraint social_follows_no_self_follow check (follower_id <> followee_id)
);

create index if not exists social_follows_followee_idx
    on public.social_follows (followee_id);

create index if not exists social_follows_follower_idx
    on public.social_follows (follower_id);

alter table public.social_follows enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'social_follows'
          and policyname = 'Social follows are readable'
    ) then
        execute $sql$
            create policy "Social follows are readable"
            on public.social_follows
            for select
            using (true);
        $sql$;
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'social_follows'
          and policyname = 'Users can follow others'
    ) then
        execute $sql$
            create policy "Users can follow others"
            on public.social_follows
            for insert
            with check (auth.uid() = follower_id);
        $sql$;
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'social_follows'
          and policyname = 'Users can unfollow others'
    ) then
        execute $sql$
            create policy "Users can unfollow others"
            on public.social_follows
            for delete
            using (auth.uid() = follower_id);
        $sql$;
    end if;
end
$$;

-- 2. Favorites indexes (table already exists)
create index if not exists favorites_user_idx
    on public.favorites (user_id);

create index if not exists favorites_recipe_idx
    on public.favorites (recipe_id);

-- Allow reading favorites to drive social feeds
alter table public.favorites enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'favorites'
          and policyname = 'Favorites are readable'
    ) then
        execute $sql$
            create policy "Favorites are readable"
            on public.favorites
            for select
            using (true);
        $sql$;
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'favorites'
          and policyname = 'Users manage their favorites'
    ) then
        execute $sql$
            create policy "Users manage their favorites"
            on public.favorites
            for all
            using (auth.uid() = user_id)
            with check (auth.uid() = user_id);
        $sql$;
    end if;
end
$$;


