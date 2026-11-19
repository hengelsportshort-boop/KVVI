import { addWedstrijd, updateWedstrijd, deleteWedstrijd, getWedstrijden, getKalenderjaar, setKalenderjaar } from '../../lib/kalenderManager.js';

export async function GET({ url }) {
  try {
    const data = getWedstrijden();
    if (url.searchParams.get('settings') === '1') {
      return new Response(JSON.stringify({ wedstrijden: data, kalenderjaar: getKalenderjaar() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.datum || !body.dag || !body.reeks) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Alle velden zijn verplicht' 
      }), { status: 400 });
    }
    
    // Validate date format (DD/MM)
    if (!/^\d{2}\/\d{2}$/.test(body.datum)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Datum moet in DD/MM formaat zijn' 
      }), { status: 400 });
    }
    
    const wedstrijd = addWedstrijd(body);
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: wedstrijd 
    }), { status: 201 });
    
  } catch (error) {
    console.error('POST /api/kalender error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Interne server fout' 
    }), { status: 500 });
  }
}

export async function PUT({ request }) {
  try {
    const body = await request.json();

    if (body.kalenderjaar !== undefined) {
      const kalenderjaar = Number(body.kalenderjaar);
      if (!Number.isInteger(kalenderjaar) || kalenderjaar < 2000 || kalenderjaar > 2100) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Kalenderjaar moet een geldig jaar tussen 2000 en 2100 zijn'
        }), { status: 400 });
      }

      setKalenderjaar(kalenderjaar);
      return new Response(JSON.stringify({ success: true, kalenderjaar }), { status: 200 });
    }
    
    if (!body.id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'ID is verplicht' 
      }), { status: 400 });
    }
    
    // Validate date format if provided
    if (body.datum && !/^\d{2}\/\d{2}$/.test(body.datum)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Datum moet in DD/MM formaat zijn' 
      }), { status: 400 });
    }
    
    const wedstrijd = updateWedstrijd(body.id, body);
    
    if (!wedstrijd) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Wedstrijd niet gevonden' 
      }), { status: 404 });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: wedstrijd 
    }), { status: 200 });
    
  } catch (error) {
    console.error('PUT /api/kalender error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Interne server fout' 
    }), { status: 500 });
  }
}

export async function DELETE({ request }) {
  try {
    const body = await request.json();
    
    if (!body.id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'ID is verplicht' 
      }), { status: 400 });
    }
    
    const success = deleteWedstrijd(body.id);
    
    if (!success) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Wedstrijd niet gevonden' 
      }), { status: 404 });
    }
    
    return new Response(JSON.stringify({ 
      success: true 
    }), { status: 200 });
    
  } catch (error) {
    console.error('DELETE /api/kalender error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Interne server fout' 
    }), { status: 500 });
  }
}
