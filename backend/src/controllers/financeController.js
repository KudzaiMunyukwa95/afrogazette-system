==> Downloading cache...
==> Cloning from https://github.com/KudzaiMunyukwa95/afrogazette-system
==> Checking out commit 36f49fd0a63427ea70e42ab7a63b8854084e3083 in branch main
==> Downloaded 75MB in 8s. Extraction took 2s.
==> Using Node.js version 22.16.0 (default)
==> Docs on specifying a Node.js version: https://render.com/docs/node-version
==> Running build command 'npm install'...
up to date, audited 196 packages in 2s
52 packages are looking for funding
  run `npm fund` for details
4 high severity vulnerabilities
To address all issues, run:
  npm audit fix
Run `npm audit` for details.
==> Uploading build...
==> Uploaded in 4.8s. Compression took 2.2s
==> Build successful 🎉
==> Deploying...
==> Running 'npm start'
> afrogazette-backend@1.0.0 start
> node src/server.js
/opt/render/project/src/backend/node_modules/express/lib/router/route.js:216
        throw new Error(msg);
        ^
Error: Route.get() requires a callback function but got a [object Undefined]
    at Route.<computed> [as get] (/opt/render/project/src/backend/node_modules/express/lib/router/route.js:216:15)
    at proto.<computed> [as get] (/opt/render/project/src/backend/node_modules/express/lib/router/index.js:521:19)
    at Object.<anonymous> (/opt/render/project/src/backend/src/routes/financeRoutes.js:51:8)
    at Module._compile (node:internal/modules/cjs/loader:1730:14)
    at Object..js (node:internal/modules/cjs/loader:1895:10)
    at Module.load (node:internal/modules/cjs/loader:1465:32)
    at Function._load (node:internal/modules/cjs/loader:1282:12)
    at TracingChannel.traceSync (node:diagnostics_channel:322:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:235:24)
    at Module.require (node:internal/modules/cjs/loader:1487:12)
Node.js v22.16.0
==> Exited with status 1
==> Common ways to troubleshoot your deploy: https://render.com/docs/troubleshooting-deploys
==> Running 'npm start'
> afrogazette-backend@1.0.0 start
> node src/server.js
/opt/render/project/src/backend/node_modules/express/lib/router/route.js:216
        throw new Error(msg);
        ^
Error: Route.get() requires a callback function but got a [object Undefined]
    at Route.<computed> [as get] (/opt/render/project/src/backend/node_modules/express/lib/router/route.js:216:15)
    at proto.<computed> [as get] (/opt/render/project/src/backend/node_modules/express/lib/router/index.js:521:19)
    at Object.<anonymous> (/opt/render/project/src/backend/src/routes/financeRoutes.js:51:8)
    at Module._compile (node:internal/modules/cjs/loader:1730:14)
    at Object..js (node:internal/modules/cjs/loader:1895:10)
    at Module.load (node:internal/modules/cjs/loader:1465:32)
    at Function._load (node:internal/modules/cjs/loader:1282:12)
    at TracingChannel.traceSync (node:diagnostics_channel:322:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:235:24)
    at Module.require (node:internal/modules/cjs/loader:1487:12)
Node.js v22.16.0
