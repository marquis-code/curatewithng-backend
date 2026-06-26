const { Resend } = require('resend');
const resend = new Resend('re_DHh876PP_6RCuJk72m9J5R6zdCzzUFhhE');

async function test() {
  try {
    const data = await resend.emails.send({
      from: 'CurateWithNG <hello@curatewithng.com>',
      to: 'test@example.com',
      subject: 'Hello World',
      html: '<p>It works!</p>'
    });
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}
test();
