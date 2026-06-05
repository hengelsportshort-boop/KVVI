export const prerender = false;

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

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
      const { execSync } = await import('node:child_process');
      execSync(`echo ${JSON.stringify(text)} | mail -s "Contactformulier KVVI" hengelsport.short@gmail.com`, {
        timeout: 10000,
        shell: true
      });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch {
      // sendmail fallback
      try {
        const { execSync } = await import('node:child_process');
        execSync(`printf '%s' ${JSON.stringify(text)} | sendmail -i hengelsport.short@gmail.com`, {
          timeout: 10000,
          shell: true
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
