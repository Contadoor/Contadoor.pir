// ============================================================
// supabase.js — Cliente Supabase compartido · Gestoor
// <script src="../supabase.js"></script> en todos los módulos
// ============================================================

var SB_URL = 'https://ulxoxqbuxiuylaolaqxj.supabase.co';
var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseG94cWJ1eGl1eWxhb2xhcXhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNDMwNDcsImV4cCI6MjA5OTcxOTA0N30.bN_KeSJFEBKSBzwTixRQs92y6aEhBo-SJs4fGxZgAbA';

// ── CORE ─────────────────────────────────────────────────────
function sbH(extra){
  return Object.assign({'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'},extra||{});
}
function sbFetch(path,opts){
  var o=opts||{};
  return fetch(SB_URL+'/rest/v1/'+path,Object.assign({},o,{headers:sbH(o.headers||{})}));
}
function sbGet(path){
  return sbFetch(path).then(function(r){return r.ok?r.json():[];}).catch(function(){return[];});
}
function sbPost(table,data,prefer){
  return sbFetch(table,{method:'POST',headers:{'Prefer':prefer||'resolution=merge-duplicates,return=representation'},body:JSON.stringify(data)})
    .then(function(r){return r.ok?r.json():null;}).catch(function(){return null;});
}
function sbPatch(path,data){
  return sbFetch(path,{method:'PATCH',headers:{'Prefer':'return=representation'},body:JSON.stringify(data)})
    .then(function(r){return r.ok?r.json():null;}).catch(function(){return null;});
}
function sbDelete(path){
  return sbFetch(path,{method:'DELETE'}).then(function(r){return r.ok;}).catch(function(){return false;});
}
function sbUpsert(table,data){return sbPost(table,data,'resolution=merge-duplicates,return=representation');}

// ── CACHÉ EN MEMORIA (TTL 5 min) ─────────────────────────────
var _sbCache={};
var SB_TTL=5*60*1000;
function sbCacheGet(k){
  var c=_sbCache[k];
  if(!c||!c.d) return null;
  if(Date.now()-c.ts>SB_TTL){delete _sbCache[k];return null;}
  return c.d;
}
function sbCacheSet(k,d){
  _sbCache[k]={d:d,ts:Date.now()};
  try{localStorage.setItem('sbc_'+k,JSON.stringify({d:d,ts:Date.now()}));}catch(e){}
}
function sbCacheInvalidate(k){
  delete _sbCache[k];
  try{localStorage.removeItem('sbc_'+k);}catch(e){}
}
// Lee caché memoria → localStorage → legado
function sbCacheOrLocal(k,legado){
  var m=sbCacheGet(k); if(m) return m;
  try{
    var raw=localStorage.getItem('sbc_'+k);
    if(raw){var p=JSON.parse(raw);if(p&&p.d&&Date.now()-p.ts<SB_TTL*2)return p.d;}
  }catch(e){}
  if(legado){try{return JSON.parse(localStorage.getItem(legado)||'null');}catch(e){}}
  return null;
}

// ── USUARIO ACTIVO ────────────────────────────────────────────
function getUsuario(){try{return JSON.parse(localStorage.getItem('usuario_sesion')||'{}');}catch(e){return{};}}

// ── CLIENTES ─────────────────────────────────────────────────
// Columnas reales: rut, razon_social, contacto, email, wa, tel, ciudad,
//   plan, estado, analista_rrhh, analista_contable, analista_pagos,
//   email_analista, wa_analista, tiene_rrhh, tiene_contabilidad,
//   moneda_plan, monto_base, trab_incluidos, valor_por_trab, hon_variable,
//   prioridad_rrhh, prioridad_contable, ...

function sbRowToCliente(row){
  if(!row) return null;
  return {
    id:              row.id,
    rut:             row.rut,
    razon:           row.razon_social,
    giro:            row.giro,
    email:           row.email,
    contacto:        row.contacto,
    tel:             row.tel,
    wa:              row.wa,
    ciudad:          row.ciudad,
    plan:            row.plan,
    estado:          row.estado||'activo',
    inicio:          row.fecha_inicio,
    reg:             row.regimen,
    iva:             row.iva_condicion,
    modalidad:       row.modalidad_pago,
    obsTrib:         row.obs_trib,
    moneda:          row.moneda_plan,
    monedaVar:       row.moneda_variable,
    monto:           row.monto_base,
    trab:            row.trab_incluidos||0,
    varTrab:         row.valor_por_trab||row.hon_variable,
    precioObs:       row.precio_obs,
    // Analistas
    contador:        row.analista_contable,
    rrhh:            row.analista_rrhh,
    analistaRrhh:    row.analista_rrhh,
    analistaContable:row.analista_contable,
    analistaPagos:   row.analista_pagos,
    emailAnalista:   row.email_analista,
    waAnalista:      row.wa_analista,
    prioRrhh:        row.prioridad_rrhh||'media',
    prioCont:        row.prioridad_contable||'media',
    // Credenciales
    siiU:    row.usuario_sii,    siiK:  row.clave_sii,
    prevU:   row.usuario_previred, prevK: row.clave_previred,
    cuU:     row.usuario_cu,     cuK:   row.clave_cu,
    factU:   row.usuario_fact,   factK: row.clave_fact,
    licU:    row.usuario_lic,    licK:  row.clave_lic,
    credsExtra: row.creds_extra||[],
    obsAcceso:  row.obs_acceso,
    obs:        row.obs,
    logo:       row.logo_base64,
    socios:     row.socios||[],
    // Flags servicio
    tieneRrhh:         row.tiene_rrhh!==false,
    tieneContabilidad: row.tiene_contabilidad!==false
  };
}

function sbClienteToRow(c){
  return {
    rut:               c.rut,
    razon_social:      c.razon,
    giro:              c.giro||null,
    email:             c.email||null,
    contacto:          c.contacto||null,
    tel:               c.tel||null,
    wa:                c.wa||null,
    ciudad:            c.ciudad||null,
    plan:              c.plan||null,
    estado:            c.estado||'activo',
    fecha_inicio:      c.inicio||null,
    regimen:           c.reg||null,
    iva_condicion:     c.iva||'afecto',
    modalidad_pago:    c.modalidad||'contadoor',
    obs_trib:          c.obsTrib||null,
    moneda_plan:       c.moneda||'UF',
    moneda_variable:   c.monedaVar||c.moneda||'UF',
    monto_base:        c.monto||null,
    trab_incluidos:    c.trab||0,
    valor_por_trab:    c.varTrab||null,
    hon_variable:      c.varTrab||null,
    precio_obs:        c.precioObs||null,
    analista_rrhh:     c.rrhh||c.analistaRrhh||null,
    analista_contable: c.contador||c.analistaContable||null,
    analista_pagos:    c.analistaPagos||null,
    email_analista:    c.emailAnalista||null,
    wa_analista:       c.waAnalista||null,
    prioridad_rrhh:    c.prioRrhh||'media',
    prioridad_contable:c.prioCont||'media',
    usuario_sii:       c.siiU||null,   clave_sii:       c.siiK||null,
    usuario_previred:  c.prevU||null,  clave_previred:  c.prevK||null,
    usuario_cu:        c.cuU||null,    clave_cu:        c.cuK||null,
    usuario_fact:      c.factU||null,  clave_fact:      c.factK||null,
    usuario_lic:       c.licU||null,   clave_lic:       c.licK||null,
    creds_extra:       c.credsExtra||[],
    obs_acceso:        c.obsAcceso||null,
    obs:               c.obs||null,
    logo_base64:       c.logo||null,
    socios:            c.socios||[],
    tiene_rrhh:        c.tieneRrhh!==false,
    tiene_contabilidad:c.tieneContabilidad!==false
  };
}

function sbGetClientes(cb){
  var cached=sbCacheOrLocal('clientes','clientes_bd');
  if(cached) cb(cached);  // inmediato con caché
  sbGet('clientes?select=*&order=razon_social.asc').then(function(rows){
    if(!rows||!rows.length){if(!cached)cb([]);return;}
    var mapped=rows.map(sbRowToCliente);
    sbCacheSet('clientes',mapped);
    try{localStorage.setItem('clientes_bd',JSON.stringify(mapped));}catch(e){}
    cb(mapped);
  }).catch(function(){if(!cached)cb([]);});
}

function sbUpsertCliente(c){
  var row=sbClienteToRow(c);
  if(c.id) return sbPatch('clientes?id=eq.'+c.id,row);
  return sbPost('clientes',row);
}

// ── PERIODOS ─────────────────────────────────────────────────
// Columnas reales: id, periodo, estado, uf, utm, fecha_apertura,
//   fecha_corta, abierto_por, venc_previred_*, venc_f29_*, tareas, calendario

function sbGetPeriodos(cb){
  var cached=sbCacheOrLocal('periodos','rpt_periodos');
  if(cached) cb(cached);
  sbGet('periodos?select=*&order=periodo.desc&limit=24').then(function(rows){
    if(!rows||!rows.length){if(!cached)cb([]);return;}
    sbCacheSet('periodos',rows);
    try{localStorage.setItem('rpt_periodos',JSON.stringify(rows));}catch(e){}
    cb(rows);
  }).catch(function(){if(!cached)cb([]);});
}

function sbUpsertPeriodo(p){
  return sbPost('periodos',p,'resolution=merge-duplicates');
}

// ── USUARIOS ─────────────────────────────────────────────────
function sbGetUsuarios(cb){
  var cached=sbCacheOrLocal('usuarios','usuarios_sistema');
  if(cached) cb(cached);
  sbGet('usuarios_sistema?select=*&activo=eq.true&order=nombre.asc').then(function(rows){
    if(!rows||!rows.length){if(!cached)cb([]);return;}
    var mapped=rows.map(function(r){
      return {
        id:r.id, nombre:r.nombre, iniciales:r.iniciales||'',
        email:r.email, wa:r.wa, rol:r.rol,
        rolLabel:r.rol_label, pin:r.pin,
        esMaster:r.es_master||false, activo:r.activo!==false,
        modulos:r.modulos||[], color:r.color
      };
    });
    sbCacheSet('usuarios',mapped);
    try{localStorage.setItem('usuarios_sistema',JSON.stringify(mapped));}catch(e){}
    cb(mapped);
  }).catch(function(){if(!cached)cb([]);});
}

// ── REPORTES MENSUALES ───────────────────────────────────────
// Columna FK real: cliente_rut (no rut)
// Columnas con nombre distinto:
//   n_trabajadores (app: nTrab)
//   total_descuentos (app: totalDesc)
//   aporte_patronal (app: totalAportes)
//   debito_iva (app: ivaDebito)
//   credito_iva (app: ivaCredito)
//   f29 (app: totalImpInmediato)

function sbReporteToRow(r){
  var totalCot=(r.afp||0)+(r.salud||0)+(r.apv||0)+(r.cesTrab||0)+(r.iu||0)+(r.otrosDesc||0)+(r.sis||0)+(r.mutual||0)+(r.cesEmp||0)||r.totalCot||0;
  return {
    cliente_rut:          r.rut,
    periodo:              r.periodo,
    estado:               r.estado||'borrador',
    // Info cliente desnormalizada
    cliente_nombre:       r.clienteNombre||null,
    cliente_wa:           r.clienteWa||null,
    cliente_email:        r.clienteEmail||null,
    cliente_plan:         r.clientePlan||null,
    quien_paga:           r.quienPaga||'contadoor',
    // RRHH — columnas reales
    n_trabajadores:       r.nTrab||r.trabM||0,
    liquido_pagar:        r.liquidoPagar||r.liquidoM||0,
    // Descuentos trabajadores
    afp:                  r.afp||0,
    salud:                r.salud||0,
    apv:                  r.apv||0,
    ces_trab:             r.cesTrab||0,
    iu:                   r.iu||0,
    otros_desc:           r.otrosDesc||0,
    total_desc:           r.totalDesc||0,
    total_descuentos:     r.totalDesc||0,
    // Aportes patronales
    sis:                  r.sis||0,
    mutual:               r.mutual||0,
    ces_emp:              r.cesEmp||0,
    aporte_patronal:      (r.sis||0)+(r.mutual||0)+(r.cesEmp||0),
    impuesto_unico:       r.iu||r.iuSii||0,
    total_costo_empresa:  (r.liquidoPagar||0)+(r.sis||0)+(r.mutual||0)+(r.cesEmp||0),
    total_cot:            totalCot,
    obs_rrhh:             r.obsRrhh||null,
    // IVA — columnas reales
    debito_iva:           r.ivaDebito||0,
    credito_iva:          r.ivaCredito||0,
    remanente:            r.ivaRemanenteSig||r.ivaRemanente||0,
    iva_remanente_sig:    r.ivaRemanenteSig||0,
    iva_postergado:       r.ivaPostergado||0,
    postergar_iva:        r.postergarIva||false,
    iva_fecha_venc:       r.ivaFechaVenc||null,
    // F29 — columna real: f29
    f29:                  r.totalImpInmediato||0,
    total_imp_inmediato:  r.totalImpInmediato||0,
    ppm:                  r.ppm||0,
    ppm_tasa:             r.ppmTasa||0,
    ppm_base:             r.ppmBase||0,
    ret_hon:              r.retHon||0,
    ret2:                 r.ret2||0,
    iu_sii:               r.iuSii||r.iu||0,
    otros_imp:            r.otrosImp||0,
    obs_cont:             r.obsCont||null,
    // Honorarios
    hon_base:             r.honBase||0,
    hon_base_uf:          r.honBaseUf||0,
    hon_var:              r.honVar||0,
    hon_val_trab:         r.honValTrab||0,
    hon_ntrab:            r.honNtrab||0,
    hon_total:            r.honTotal||0,
    hon_moneda:           r.honMoneda||'CLP',
    hon_estado:           r.honEstado||'pendiente',
    factura:              r.factura||null,
    factura_fecha:        r.facturaFecha||null,
    uf_periodo:           r.ufPeriodo||0,
    // Totales
    total_general:        r.totalGeneral||0,
    total_atrasos:        r.totalAtrasos||0,
    atrasos:              r.atrasos||[],
    recomendaciones:      r.recomendaciones||null,
    obs_analista:         r.obsAnalista||null,
    // Flujo pago
    pre_reporte_enviado:  r.preReporteEnviado||false,
    pre_reporte_fecha:    r.preReporteFecha||null,
    ha_postergado:        r.haPostergado||false,
    fecha_postergacion:   r.fechaPostergacion||null,
    n_recordatorios:      r.nRecordatorios||0,
    ultimo_recordatorio:  r.ultimoRecordatorio||null,
    fecha_transferido:    r.fechaTransferido||null,
    quien_transferido:    r.quienTransferido||null,
    fecha_previred:       r.fechaPrevired||null,
    quien_previred:       r.quienPrevired||null,
    fecha_aprobacion:     r.fechaAprobacion||null,
    fecha_finalizado:     r.fechaFinalizado||null,
    quien_finalizado:     r.quienFinalizado||null,
    fecha_pago:           r.fechaPago||null,
    pagado:               r.pagado||false,
    pagos_validado:       r.pagosValidado||false,
    decision_cotiz:       r.decisionCotiz||null,
    // Analistas
    analista_rrhh:        r.preparado||r.analistaRrhh||null,
    analista_contable:    r.revisado||r.analistaContable||null,
    email_analista:       r.emailAnalista||null,
    preparado:            r.preparado||null,
    revisado:             r.revisado||null,
    // Flags
    secciones:            r.secciones||{},
    usa_archivo:          r.usaArchivo||false,
    tiene_rrhh:           r.tieneRrhh!==false,
    tiene_cont:           r.tieneCont!==false,
    prioridad_rrhh:       r.prioridadRrhh||'media',
    prioridad_contable:   r.prioridadContable||'media'
  };
}

function sbRowToReporte(row){
  if(!row) return null;
  return {
    id:               row.id,
    rut:              row.cliente_rut,
    periodo:          row.periodo,
    estado:           row.estado||'borrador',
    clienteNombre:    row.cliente_nombre,
    clienteWa:        row.cliente_wa,
    clienteEmail:     row.cliente_email,
    clientePlan:      row.cliente_plan,
    quienPaga:        row.quien_paga,
    // RRHH
    nTrab:            row.n_trabajadores||0,
    liquidoPagar:     row.liquido_pagar||0,
    afp:              row.afp||0,
    salud:            row.salud||0,
    apv:              row.apv||0,
    cesTrab:          row.ces_trab||0,
    iu:               row.iu||0,
    otrosDesc:        row.otros_desc||0,
    totalDesc:        row.total_desc||row.total_descuentos||0,
    sis:              row.sis||0,
    mutual:           row.mutual||0,
    cesEmp:           row.ces_emp||0,
    totalAportes:     row.aporte_patronal||0,
    totalCot:         row.total_cot||0,
    obsRrhh:          row.obs_rrhh,
    // IVA
    ivaDebito:        row.debito_iva||0,
    ivaCredito:       row.credito_iva||0,
    ivaRemanenteSig:  row.iva_remanente_sig||row.remanente||0,
    ivaPostergado:    row.iva_postergado||0,
    postergarIva:     row.postergar_iva||false,
    ivaFechaVenc:     row.iva_fecha_venc,
    // F29
    totalImpInmediato:row.f29||row.total_imp_inmediato||0,
    ppm:              row.ppm||0,
    ppmTasa:          row.ppm_tasa||0,
    ppmBase:          row.ppm_base||0,
    retHon:           row.ret_hon||0,
    ret2:             row.ret2||0,
    iuSii:            row.iu_sii||0,
    otrosImp:         row.otros_imp||0,
    obsCont:          row.obs_cont,
    // Honorarios
    honBase:          row.hon_base||0,
    honBaseUf:        row.hon_base_uf||0,
    honVar:           row.hon_var||0,
    honValTrab:       row.hon_val_trab||0,
    honNtrab:         row.hon_ntrab||0,
    honTotal:         row.hon_total||0,
    honMoneda:        row.hon_moneda||'CLP',
    honEstado:        row.hon_estado||'pendiente',
    factura:          row.factura,
    facturaFecha:     row.factura_fecha,
    ufPeriodo:        row.uf_periodo||0,
    // Totales
    totalGeneral:     row.total_general||0,
    totalAtrasos:     row.total_atrasos||0,
    atrasos:          row.atrasos||[],
    recomendaciones:  row.recomendaciones,
    obsAnalista:      row.obs_analista,
    // Flujo
    preReporteEnviado:row.pre_reporte_enviado||false,
    preReporteFecha:  row.pre_reporte_fecha,
    haPostergado:     row.ha_postergado||false,
    fechaPostergacion:row.fecha_postergacion,
    nRecordatorios:   row.n_recordatorios||0,
    ultimoRecordatorio:row.ultimo_recordatorio,
    fechaTransferido: row.fecha_transferido,
    quienTransferido: row.quien_transferido,
    fechaPrevired:    row.fecha_previred,
    quienPrevired:    row.quien_previred,
    fechaAprobacion:  row.fecha_aprobacion,
    fechaFinalizado:  row.fecha_finalizado,
    quienFinalizado:  row.quien_finalizado,
    fechaPago:        row.fecha_pago,
    pagado:           row.pagado||false,
    pagosValidado:    row.pagos_validado||false,
    decisionCotiz:    row.decision_cotiz,
    // Analistas
    preparado:        row.preparado||row.analista_rrhh,
    revisado:         row.revisado||row.analista_contable,
    emailAnalista:    row.email_analista,
    analistaRrhh:     row.analista_rrhh,
    analistaContable: row.analista_contable,
    // Flags
    secciones:        row.secciones||{},
    usaArchivo:       row.usa_archivo||false,
    tieneRrhh:        row.tiene_rrhh!==false,
    tieneCont:        row.tiene_cont!==false,
    prioridadRrhh:    row.prioridad_rrhh||'media',
    prioridadContable:row.prioridad_contable||'media',
    ts:               new Date(row.created_at||Date.now()).getTime()
  };
}

function sbGetReportesPeriodo(periodo,cb){
  sbGet('reportes_mensuales?periodo=eq.'+encodeURIComponent(periodo)+'&select=*&order=cliente_rut.asc')
    .then(function(rows){cb((rows||[]).map(sbRowToReporte));})
    .catch(function(){cb([]);});
}

function sbUpsertReporte(r){
  var row=sbReporteToRow(r);
  if(r.id&&!String(r.id).includes('.')){
    return sbPatch('reportes_mensuales?id=eq.'+r.id,row);
  }
  return sbPost('reportes_mensuales',row);
}

function sbPatchReporte(id,data){
  return sbPatch('reportes_mensuales?id=eq.'+id,data);
}

// ── PAGOS ────────────────────────────────────────────────────
// Columna FK real: cliente_rut

function sbGetPagos(filtros,cb){
  var q='pagos?select=*&order=created_at.desc';
  if(filtros&&filtros.periodo) q+='&periodo=eq.'+encodeURIComponent(filtros.periodo);
  if(filtros&&filtros.estado)  q+='&estado=eq.'+filtros.estado;
  sbGet(q).then(function(rows){cb(rows||[]);}).catch(function(){cb([]);});
}

function sbUpsertPago(p){
  var row=Object.assign({},p);
  // normalizar FK
  if(row.rut&&!row.cliente_rut){row.cliente_rut=row.rut;delete row.rut;}
  return sbPost('pagos',row);
}

function sbPatchPago(id,data){return sbPatch('pagos?id=eq.'+id,data);}

// ── CONCILIACIÓN ─────────────────────────────────────────────
function sbGetMovimientos(cb){
  sbGet('concil_movimientos?select=*&order=fecha.desc&limit=1000')
    .then(function(rows){cb(rows||[]);}).catch(function(){cb([]);});
}
function sbUpsertMovimiento(mov){return sbPost('concil_movimientos',mov);}
function sbPatchMovimiento(id,data){return sbPatch('concil_movimientos?id=eq.'+id,data);}

// ── CONVENIOS ────────────────────────────────────────────────
// FK real: cliente_rut, cuotas: n_cuotas
function sbGetConvenios(rut,cb){
  var q='convenios?select=*'+(rut?'&cliente_rut=eq.'+encodeURIComponent(rut):'')+'&order=created_at.desc';
  sbGet(q).then(function(rows){cb(rows||[]);}).catch(function(){cb([]);});
}
function sbUpsertConvenio(c){
  var row=Object.assign({},c);
  if(row.rut&&!row.cliente_rut){row.cliente_rut=row.rut;delete row.rut;}
  if(row.cuotas!==undefined&&row.n_cuotas===undefined){row.n_cuotas=row.cuotas;delete row.cuotas;}
  return sbPost('convenios',row);
}

// ── PLANES ───────────────────────────────────────────────────
function sbGetPlanes(cb){
  var cached=sbCacheOrLocal('planes','planes_bd');
  if(cached) cb(cached);
  sbGet('planes?select=*&activo=eq.true&order=nombre.asc').then(function(rows){
    if(!rows||!rows.length){if(!cached)cb([]);return;}
    sbCacheSet('planes',rows);
    try{localStorage.setItem('planes_bd',JSON.stringify(rows));}catch(e){}
    cb(rows);
  }).catch(function(){if(!cached)cb([]);});
}

// ── SERVICIOS ADICIONALES ────────────────────────────────────
function sbGetServiciosAdicionales(cb){
  var cached=sbCacheOrLocal('servicios','servicios_adicionales');
  if(cached) cb(cached);
  sbGet('servicios_adicionales?select=*&activo=eq.true&order=nombre.asc').then(function(rows){
    if(!rows||!rows.length){if(!cached)cb([]);return;}
    sbCacheSet('servicios',rows);
    try{localStorage.setItem('servicios_adicionales',JSON.stringify(rows));}catch(e){}
    cb(rows);
  }).catch(function(){if(!cached)cb([]);});
}

// ── UTILIDADES ────────────────────────────────────────────────
function sbNormRut(rut){
  if(!rut) return '';
  var s=String(rut).replace(/[.\-\s]/g,'').toUpperCase();
  if(s.length<2) return rut;
  return s.slice(0,-1).replace(/\B(?=(\d{3})+(?!\d))/g,'.')+'-'+s.slice(-1);
}

console.log('✅ supabase.js v2 · Gestoor');
