import mysql from 'mysql2/promise';
import fastify from 'fastify';
import cors from '@fastify/cors';

const app = fastify();

app.register(cors);

app.get('/atletas', async (request, reply) => {
  try {
    const conn = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "JBB", // seu banco de dados correto
      port: 3306
    });

    const [rows] = await conn.query(`
      SELECT registro as id, nome, 
             altura, 
             forca, resistencia, velocidade, impulsao, arremesso,
             TIMESTAMPDIFF(YEAR, dataNascimento, CURDATE()) AS idade
      FROM atletas
    `);

    reply.status(200).send(rows);
    await conn.end();
  } catch (err) {
    console.error(err);
    reply.status(500).send({ mensagem: "Erro no servidor" });
  }
});

app.listen({ port: 8000 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Servidor rodando em: ${address}`);
});
