import * as React from "preact";
import config from "server/core/config";
import constants from "server/core/constants";
import * as templatingFilters from "server/core/templating-filters";
import { dateTime } from "server/core/templating-filters";
import { ifFalse, ifTrue } from "server/macros/jsx-utils";
import adminBase from "../admin.base";
import { AdminStatusContext } from "./admin-status.controller";

export default function render(context: AdminStatusContext) {
  const { devMode, pictureResizeEnabled, caches, user } = context;

  return adminBase(context,
    <div>
      <h1>Server status</h1>

      <h2>General</h2>

      <table class="table" style="max-width: 300px">
        <tbody>
          <tr>
            <td>Dev mode</td>
            <td><span class="badge badge-secondary">{devMode.toString()}</span></td>
          </tr>
          <tr>
            <td>Picture resizing enabled</td>
            <td><span class="badge badge-secondary">{pictureResizeEnabled.toString()}</span></td>
          </tr>
        </tbody>
      </table>

      <h2>Caches</h2>

      {ifTrue(config.DEBUG_DISABLE_CACHE, () =>
        <div>Caching disabled in <code>config.js</code>.</div>
      )}

      {Object.entries(caches).map(([cacheName, cache], index) => {
        const cacheStats = cache.getStats();
        const isLast = index === Object.keys(caches).length - 1;

        return <div>
          <h4>{cacheName}</h4>

          <div class="card card-body">
            <div class="float-right">
              <a href={`/admin/status?clearCache=${ cacheName }`} class="btn btn-danger">Clear</a>
            </div>

            <ul>
              <li>Key count: <b>{cacheStats.keys}</b></li>
              <li>Hits: <b>{cacheStats.hits}</b></li>
              <li>Misses: <b>{cacheStats.misses}</b></li>
              <li>Keys size: <b>{cacheStats.ksize}</b></li>
              <li>Values size: <b>{cacheStats.vsize}</b></li>
            </ul>

            <table class="table" style="max-width: 300px">
              <tbody>
                <tr>
                  <th>Key</th>
                  <th style="min-width: 180px">TTL</th>
                  <th>Value</th>
                </tr>
                {cache.keys().map(key =>
                  <tr>
                    <td>{key}</td>
                    <td>{dateTime(cache.getTtl(key), user)}</td>
                    <td style="max-width: 500px; overflow: auto">
                      {ifTrue(constants.CONFIDENTIAL_CACHE_KEYS.includes(key), () =>
                        <span class="badge badge-secondary">TOP SECRET</span>
                      )}
                      {ifFalse(constants.CONFIDENTIAL_CACHE_KEYS.includes(key), () => {
                        const value = templatingFilters.prettyDump(cache.get(key));
                        if (value.__html.length > 100) {
                          return <div>
                            <input type="button" class="btn btn-sm btn-outline-primary" value="Toggle" onclick={`$('#${ key }').toggle()`} />
                            <div id={ key } style="display: none" dangerouslySetInnerHTML={value} />
                          </div>;
                        } else {
                          return <div dangerouslySetInnerHTML={value} />;
                        }
                      })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

          </div>

          {ifFalse(isLast, () =>
            <div class="horizontal-bar"></div>
          )}
        </div>
      })}
    </div>
  );
}
