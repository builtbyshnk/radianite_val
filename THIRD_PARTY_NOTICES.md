# Third-Party Notices

Radianite is licensed under the GNU General Public License v3.0 only. See
[LICENSE](LICENSE).

This file lists third-party material included in or distributed with Radianite
and the licenses that apply to each portion.

---

## Solar Icons (CC BY 4.0)

`docs/assets/solar/bold.svg` contains selected Solar Bold icons from
[`@solar-icons/static` 2.3.3](https://www.npmjs.com/package/@solar-icons/static).
The Solar Icon Set is by [480 Design](https://www.figma.com/community/file/1166831539721848736),
licensed under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).
The original icon paths are unchanged and packaged as SVG symbols for local use.
Visible attribution is included in the website footer.

`src-rs/src/overlay/index.html` embeds the Solar Bold `gamepad`,
`graph-up`, and `pulse` icon paths from `@solar-icons/svelte` 2.3.3 for the
OBS overlay. The original icon paths are unchanged.

## Discord brand assets

`src-ui/assets/discord/discord-symbol-white.svg` and the white and black
`discord-symbol-*.svg` files in `docs/assets/` are unmodified copies of the
official Clyde symbols linked from [Discord's branding page](https://discord.com/branding).

- [Original white SVG](https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/66e3d7f4ef6498ac018f2c55_Symbol.svg)
- [Original black SVG](https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/66e3d8014ea898f3a4b2156c_Symbol.svg)
- Downloaded October 24, 2026.

Discord's trademarks and brand assets belong to Discord Inc. and are governed
by its brand guidelines; they are not covered by Radianite's GPL license.
Use the supplied artwork without recoloring, distortion, or redrawing.

## valorant-rpc community translations (MIT License)

Portions of the Discord Rich Presence locale strings in `src-rs/locales/`
(excluding `en-US.json`) are derived from community translations in:

- [OGKushhh/ValorantRPC](https://github.com/OGKushhh/ValorantRPC) (maintained
  community fork, MIT License)
- [colinhartigan/valorant-rpc](https://github.com/colinhartigan/valorant-rpc)
  (original project, MIT License)

Strings were adapted for Radianite's locale key format and `%{placeholder}`
syntax. Radianite application code, UI translations in `src-ui/locales/ui/`,
and the English (`en-US`) RPC catalog are original Radianite work under GPLv3.

Per-locale translator credits are listed in
[`locale-registry.json`](locale-registry.json) under each locale's
`contributors` field.

```
MIT License

Copyright (c) valorant-rpc contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
