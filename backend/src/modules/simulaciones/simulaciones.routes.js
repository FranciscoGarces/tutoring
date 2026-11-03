const voz = require("./controllers/voz.controller");
const informes = require("./controllers/informes.controller");

module.exports = [
  { method: "POST", path: "/api/voz/token", handler: voz.token },
  { method: "POST", path: "/api/voz/uso", handler: voz.uso },
  { method: "GET", path: "/api/informes", handler: informes.listar },
  { method: "POST", path: "/api/informes", handler: informes.crear },
  { method: "*", path: /^\/api\/informes\/([^/]+)$/, handler: informes.porId }
];
