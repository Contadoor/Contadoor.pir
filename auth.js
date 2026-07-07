// auth.js — Contadoor.app v1.0
// Incluir en todos los módulos: <script src="../auth.js"></script>
// En el dashboard (raíz): <script src="auth.js"></script>

(function(){
  var LOGIN_PAGE = 'login.html';

  // Detectar si estamos en la raíz o en un subdirectorio
  var depth = window.location.pathname.split('/').filter(Boolean).length;
  var esRaiz = window.location.pathname.endsWith('/') ||
               window.location.pathname.endsWith('index.html') &&
               !window.location.pathname.includes('/clientes/') &&
               !window.location.pathname.includes('/pir/') &&
               !window.location.pathname.includes('/reportes/') &&
               !window.location.pathname.includes('/pagos/') &&
               !window.location.pathname.includes('/admin/') &&
               !window.location.pathname.includes('/conciliacion/');
  var loginUrl = esRaiz ? LOGIN_PAGE : '../' + LOGIN_PAGE;

  // Mapa módulo → ID
  var MODULO_ACTUAL = (function(){
    var path = window.location.pathname;
    if(path.includes('/clientes/'))    return 'clientes';
    if(path.includes('/pir/'))         return 'pir';
    if(path.includes('/reportes/'))    return 'reportes';
    if(path.includes('/pagos/'))       return 'pagos';
    if(path.includes('/conciliacion/'))return 'conciliacion';
    if(path.includes('/cobranza/'))    return 'cobranza';
    if(path.includes('/crm/'))         return 'crm';
    if(path.includes('/admin/'))       return 'admin';
    return 'dashboard';
  })();

  function getSession(){
    try{ return JSON.parse(sessionStorage.getItem('usuario_activo')||'null'); }
    catch(e){ return null; }
  }

  function redirigirLogin(){
    window.location.href = loginUrl + '?redirect=' + encodeURIComponent(window.location.href);
  }

  var sesion = getSession();

  // Sin sesión → login
  if(!sesion){
    redirigirLogin();
    return;
  }

  // Sesión expirada (8 horas)
  if(Date.now() - sesion.tsLogin > 8 * 60 * 60 * 1000){
    sessionStorage.removeItem('usuario_activo');
    redirigirLogin();
    return;
  }

  // Verificar acceso al módulo actual
  if(!sesion.esMaster && !(sesion.modulos||[]).includes(MODULO_ACTUAL)){
    document.addEventListener('DOMContentLoaded', function(){
      document.body.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f0ebff;font-family:sans-serif">'
        +'<div style="text-align:center;padding:40px">'
        +'<div style="font-size:48px;margin-bottom:16px">⛔</div>'
        +'<h2 style="color:#904891;font-size:20px;margin-bottom:8px">Acceso denegado</h2>'
        +'<p style="color:#5c4a5d;margin-bottom:20px">No tienes permiso para acceder a este módulo.</p>'
        +'<p style="color:#9a849b;font-size:13px;margin-bottom:20px">Contacta a Luciano para solicitar acceso.</p>'
        +'<a href="' + (esRaiz ? 'index.html' : '../index.html') + '" '
        +'style="background:#904891;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">← Volver al dashboard</a>'
        +'</div></div>';
    });
    return;
  }

  // Sesión válida — inyectar info en topbar si existe
  document.addEventListener('DOMContentLoaded', function(){
    var topbar = document.querySelector('.topbar');
    if(!topbar) return;

    // Badge de usuario activo
    var badge = document.createElement('div');
    badge.style.cssText = 'display:flex;align-items:center;gap:8px;margin-right:8px';
    badge.innerHTML =
      '<div style="width:28px;height:28px;border-radius:50%;background:rgba(144,72,145,.3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">'
      + sesion.nombre.split(' ').map(function(w){return w[0];}).join('').slice(0,2).toUpperCase()
      +'</div>'
      +'<div style="text-align:right">'
      +'<div style="font-size:11px;font-weight:600;color:rgba(255,255,255,.8)">' + sesion.nombre + '</div>'
      +'<div style="font-size:9px;color:rgba(255,255,255,.3)">' + sesion.rol + '</div>'
      +'</div>';

    // Botón cerrar sesión
    var btnLogout = document.createElement('button');
    btnLogout.textContent = 'Salir';
    btnLogout.style.cssText = 'background:rgba(255,255,255,.08);color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:5px 10px;font-size:11px;cursor:pointer;font-family:inherit';
    btnLogout.onclick = function(){
      if(confirm('¿Cerrar sesión?')){
        sessionStorage.removeItem('usuario_activo');
        window.location.href = loginUrl;
      }
    };

    // Insertar antes del último botón del topbar
    var lastBtn = topbar.querySelector('button:last-child');
    if(lastBtn) topbar.insertBefore(badge, lastBtn);
    else topbar.appendChild(badge);
    topbar.appendChild(btnLogout);
  });

})();
