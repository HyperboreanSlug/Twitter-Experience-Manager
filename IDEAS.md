# Usability feature ideas for Twitter Experience Manager

Ideas for future modules. Each includes **pros** and **cons**. None of these are implemented unless noted.

---

## 1. Keyword mute / hide (client-side)

Hide tweets containing words, phrases, or regex without using X’s limited mute words (e.g. whole-word, AND/OR, author-scoped).

| Pros | Cons |
|------|------|
| Instant feedback; works on Home, search, profiles | Breaks if DOM structure changes |
| More powerful than native mute words | Only hides in *this* browser; not synced |
| No server write actions | Can hide context you still wanted |

---

## 2. “Following only” hard mode / Following feed booster

Force-focus Following tab, collapse For You, hide Trends / Who to follow / Communities upsell.

| Pros | Cons |
|------|------|
| Cleaner chronological-ish experience | X may keep pushing For You via navigation |
| Low risk (mostly CSS/DOM hide) | Cosmetic only — ranking still server-side |

---

## 3. Reply quality filter

Hide replies under a minimum account age, follower count, or with default avatars / zero posts.

| Pros | Cons |
|------|------|
| Cuts spam and drive-by harassment in threads | Collapses legitimate new accounts |
| Configurable thresholds | Extra profile lookups → rate limits |

---

## 4. Media bandwidth saver

Auto-pause videos, block autoplay GIFs, lazy-load images only on hover, optional grayscale mode.

| Pros | Cons |
|------|------|
| Real battery/data wins on mobile | Easy to miss visual context |
| Pure client-side | Site updates break selectors |

---

## 5. Engagement budget

Daily soft caps: “only 20 likes / 10 replies,” with a visible counter and optional lockout.

| Pros | Cons |
|------|------|
| Supports intentional use / digital wellbeing | Easy to bypass (disable script) |
| No need for X API write if it only *warns* | Enforced caps require intercepting clicks |

---

## 6. Quote-tweet unfurl control

Collapse quote-tweet chains or external card previews by default; expand on click.

| Pros | Cons |
|------|------|
| Reduces quote-dunk pile-ons and doomscroll | Hides information by default |
| Lightweight CSS/JS | May confuse conversation structure |

---

## 7. List-first navigation

Pin custom Lists in the panel; one-click jump; optional auto-open a List instead of Home.

| Pros | Cons |
|------|------|
| High-signal reading without algorithmic Home | Lists still require manual curation |
| Aligns with power-user workflows | No help if you don’t maintain Lists |

---

## 8. Ghost / inactive following detector

Flag accounts with no posts in N days (from profile or following sort enrichment).

| Pros | Cons |
|------|------|
| Complements ratio cleanup (Tweepcred Unfollow) | Inactive ≠ worthless (lurkers, archives) |
| Data reusable from Followers enrich | Many API calls on large following graphs |

---

## 9. Soft region / language feed filter (hide, not block)

Hide timeline posts matching language scripts or location needles **without** blocking.

| Pros | Cons |
|------|------|
| Reversible; fewer ToS-risk write actions | Same false-positive issues as Geo Guard |
| Safer default than auto-block | Still a form of demographic filtering |

---

## 10. Cross-session notes on profiles

Attach private notes to handles (“met at conf”, “spam?”, “source”) stored locally.

| Pros | Cons |
|------|------|
| Huge memory aid; no server | Notes stuck to one browser profile |
| Low risk | Privacy if machine is shared |

---

## 11. Notification triage

On `/notifications`, collapse “liked by” / “followed you” bulk groups; highlight replies/mentions only.

| Pros | Cons |
|------|------|
| Surfaces high-signal notifications | Can hide social proof you care about |
| Mostly DOM filtering | Fragile selectors |

---

## 12. Shared rate-budget meter

Single dashboard of GraphQL/REST calls this session across modules (Followers enrich + Geo Guard).

| Pros | Cons |
|------|------|
| Prevents accidental 429s when multi-tooling | Approximate unless all calls go through Core |
| Better ops hygiene | Overhead and bookkeeping complexity |

---

## Prioritization suggestion

1. **Shared rate-budget meter** + **soft hide filter** (safer than block)  
2. **Keyword mute** + **List-first nav** (daily readability)  
3. **Ghost following detector** (pairs with Tweepcred Unfollow)  
4. Engagement budget / media saver (wellbeing niche)
