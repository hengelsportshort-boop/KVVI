export const prerender = false;

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { name, email, message, _hp } = body;

    if (_hp) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ success: false, error: 'Vul alle velden in.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const subject = 'Contactformulier KVVI';
    const text = `Nieuw contactbericht van kvvi.be\n\n` +
      `Naam: ${name}\n` +
      `E-mail: ${email}\n\n` +
      `Bericht:\n${message}`;

    try {
      const { execFileSync } = await import('node:child_process');
      execFileSync('mail', ['-s', subject, 'hengelsport.short@gmail.com'], {
        input: text,
        timeout: 10000
      });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch {
      // sendmail fallback
      try {
        const { execFileSync } = await import('node:child_process');
        execFileSync('sendmail', ['-i', 'hengelsport.short@gmail.com'], {
          input: text,
          timeout: 10000
        });
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch {
        return new Response(JSON.stringify({
          success: false,
          error: 'E-mailserver niet beschikbaar. Gebruik de fallback link.'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
