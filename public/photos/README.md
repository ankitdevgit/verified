# Placeholder premises photos

Stand-in imagery for hospital and clinic listings until real uploads exist.
Referenced from `PIC` in `lib/api/seed.ts` — the filenames below are the
contract; swap the file contents freely, keep the names.

| File | Shows | In place |
| --- | --- | --- |
| `hospital-glass-facade.jpg` | Blue glass multi-storey hospital, ambulances at the porch | yes |
| `hospital-street.jpg` | White hospital block with the blue H sign, from the street | yes |
| `hospital-tower.jpg` | Curved glass hospital tower, ambulance at the entrance | yes |
| `hospital-civic-block.jpg` | Older government general hospital block | no |
| `clinic-interior.jpg` | Lit clinic reception wall with the doctor board | no |

Every hospital listing leads with one of the three that are in place, so search
rows always show a real photo. The two clinics lead with `clinic-interior.jpg`
and stay on the placeholder until it exists.

Anything named `*-logo.png` is letterboxed (`object-contain`) rather than
cropped — see `pic()` in the seed file. Nothing in the pool uses that today.

Missing files are not a failure state — `PhotoImage` drops out on load error and
the tinted placeholder behind it shows instead.

Landscape sources crop best; the profile hero is roughly 2:1 and the search-row
thumbnail is square. Labs and the dentist deliberately have no photo so the
tinted placeholder block stays on screen somewhere.
