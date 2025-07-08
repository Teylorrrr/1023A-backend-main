import mysql from 'mysql2/promise';
import fastify from 'fastify';
import cors from '@fastify/cors';

const app = fastify();

app.register(cors);

(async () => {
  const conn = await mysql.createConnection({
    host: "localhost",
    user: 'root',
    password: "",
    database: 'JBB',
    port: 3306
  });

  app.get('/atletas', async (request, reply) => {
    try {
      const [rows] = await conn.query(`
        SELECT
          registro AS registroAtleta,
          nome,
          nomeCamisa,
          numeroCamisa,
          posicao,
          altura,
          peso,
          YEAR(CURDATE()) - YEAR(dataNascimento) AS idade
        FROM atletas
      `);
      reply.send(rows);
    } catch (err) {
      console.error(err);
      reply.status(500).send({ mensagem: "Erro no servidor" });
    }
  });

  app.get('/atletas/:registroAtleta', async (request, reply) => {
    const { registroAtleta } = request.params as { registroAtleta: string };
    try {
      const [rows] = await conn.query(`
        SELECT 
          registro AS registroAtleta,
          nome,
          nomeCamisa,
          numeroCamisa,
          altura,
          peso,
          posicao,
          paisOrigem,
          estadoOrigem,
          cidadeOrigem,
          YEAR(CURDATE()) - YEAR(dataNascimento) AS idade
        FROM atletas
        WHERE registro = ?
      `, [registroAtleta]);

      if (Array.isArray(rows) && rows.length > 0) {
        reply.send(rows[0]);
      } else {
        reply.status(404).send({ mensagem: "Atleta não encontrado" });
      }
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
})();
