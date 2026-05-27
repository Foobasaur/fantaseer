import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';
import path from 'path';
import crypto from 'crypto';

const TWITCH_HELPER = 'https://extension-files.twitch.tv/helper/v1/twitch-ext.min.js';

/**
 * @param {{ out?: string }} options
 * @returns {import('@sveltejs/kit').Adapter}
 */
export default function (options = {}) {
  const { out = '.build/extension' } = options;

  return {
    name: 'adapter-twitch-extension',

    async adapt(builder) {
      builder.rimraf(out);
      builder.mkdirp(out);

      builder.writeClient(out);
      await builder.generateFallback(path.join(out, 'index.html'));

      // ── Twitch CSP compliance + CDN path fixes ──────────────
      const htmlFiles = globSync(`${out}/**/*.html`);

      for (const htmlFile of htmlFiles) {
        let html = readFileSync(htmlFile, 'utf-8');

        // Externalize inline scripts (Twitch CSP blocks inline scripts)
        const inlineScriptRegex = /<script(?![^>]*\bsrc\b)([^>]*)>([\s\S]*?)<\/script>/gi;
        let match;
        while ((match = inlineScriptRegex.exec(html)) !== null) {
          const [fullMatch, attrs, content] = match;
          const trimmed = content.trim();
          if (!trimmed) continue;

          const hash = crypto.createHash('md5').update(trimmed).digest('hex').slice(0, 8);
          const scriptName = `init-${hash}.js`;

          const fixed = trimmed
            .replaceAll('"/_app/', '"./_app/')
            .replaceAll("'/_app/", "'./_app/")
            .replace(
              /base:\s*new URL\(['"]\.['"],\s*location\)\.pathname\.slice\(0,\s*-1\)/,
              `base: location.pathname.replace(/\\/$|\\/[^/]*\\.[^/]*$/, '')`
            )
            .replace(/\s+/g, ' ')
            .trim();

          writeFileSync(path.join(out, scriptName), fixed);
          html = html.replace(fullMatch, `<script${attrs} src="./${scriptName}"></script>`);
        }

        // Fix absolute asset paths to relative (Twitch CDN serves from versioned subdirectory)
        html = html.replaceAll('"/_app/', '"./_app/');
        html = html.replaceAll("'/_app/", "'./_app/");
        // Inline CSS, rewriting relative url() refs to include the CSS file's directory.
        // Stash data: URIs first so their internal url(...) refs aren't accidentally rewritten.
        const linkRegex = /<link\b[^>]*\brel="stylesheet"[^>]*>/gi;
        html = html.replace(linkRegex, m => {
          const hrefMatch = m.match(/href="([^"]+)"/);
          if (!hrefMatch) return m;
          const href = hrefMatch[1];
          if (!/^(\.\/)?_app\//.test(href)) return m;
          const relHref = href.replace(/^\.\//, '');
          const cssPath = path.join(out, relHref);
          try {
            let css = readFileSync(cssPath, 'utf-8');
            const cssDir = path.posix.dirname(relHref); // e.g. _app/immutable/assets

            // 1. Stash data: URIs so their inner url(...) refs are left alone
            const ph = [];
            css = css.replace(/url\(\s*("|')data:[\s\S]*?\1\s*\)/g, mm => {
              const i = ph.length;
              ph.push(mm);
              return `__CSS_URL_PH_${i}__`;
            });
            css = css.replace(/url\(\s*data:[^)]*\s*\)/g, mm => {
              const i = ph.length;
              ph.push(mm);
              return `__CSS_URL_PH_${i}__`;
            });

            // 2. Rewrite relative url() refs to include the CSS file's directory
            css = css.replace(/url\(\s*("|'|)([^"')\s]+)\1\s*\)/g, (mm, q, u) => {
              if (/^(data:|https?:|\/|#)/.test(u)) return mm;
              return `url(${q}./${cssDir}/${u.replace(/^\.\//, '')}${q})`;
            });

            // 3. Restore data URIs
            css = css.replace(/__CSS_URL_PH_(\d+)__/g, (_, i) => ph[+i]);

            return `<style>${css}</style>`;
          } catch {
            return m;
          }
        });
        writeFileSync(htmlFile, html);
      }

      builder.log.minor(`Twitch Extension output: ${out}`);
    }
  };
}
