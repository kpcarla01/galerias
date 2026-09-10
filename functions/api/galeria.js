// functions/api/galeria.js
// Cloudflare Pages Function - Proxy hacia Google Apps Script
// Esta función recibe las peticiones del cliente y las reenvía a tu Apps Script.

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const galeriaId = url.searchParams.get('galeria') || 'G001';

  // ⚠️ Tu URL de Apps Script (NO cambiar salvo que generes una nueva implementación)
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxq-kG8G-nu12nuPfky-cdAbxCG7Wqw_5jljFuhPLDYy3OieRsq789nVCqUMR81WZJo/exec';

  // ---- GET: obtener datos de la galería ----
  if (request.method === 'GET') {
    try {
      const respuesta = await fetch(`${APPS_SCRIPT_URL}?galeria=${encodeURIComponent(galeriaId)}`);
      const texto = await respuesta.text();

      return new Response(texto, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Error del servidor: ' + error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }

  // ---- POST: guardar selección ----
  if (request.method === 'POST') {
    try {
      const bodyText = await request.text();

      const respuesta = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: bodyText
      });

      const texto = await respuesta.text();

      return new Response(texto, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Error del servidor: ' + error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }

  // ---- OPTIONS: preflight CORS ----
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  // ---- Otros métodos ----
  return new Response(JSON.stringify({ error: 'Método no permitido' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
