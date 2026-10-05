<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- In-game HUD is modular under src/ui/hud (one file per HUD region) with sheet/feed state in src/state/hud-store.ts — keeps regions independently replaceable.
- Character identity definitions live under src/identity and profiles persist in Lovable Cloud; staff roles and collectible ownership are server-authoritative — prevents client-side privilege or premium-item spoofing.
- Character customization uses the profile store's single live appearance draft for both editor preview and in-world avatar, while the player root transform remains canonical — prevents scale and synchronization regressions.
