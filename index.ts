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
          saltoVertical,
          envergadura,
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
app.get('/atletas/:registroAtleta/desempenho', async (request, reply) => {
  const { registroAtleta } = request.params as { registroAtleta: string };
  try {
    const [rows] = await conn.query(`
      SELECT 
        jogos_idJogo,
        minutosJogador,
        pontos,
        assistencias,
        rebotes,
        bloqueios,
        roubos,
        turnovers,
        faltasCometidas,
        arremessosConvertidos,
        arremessosTentados,
        lancesLivresConvertidos,
        lancesLivresTentados,
        bolasTresConvertidas,
        bolasTresTentadas
      FROM atletasEstatisticasJogos
      WHERE atletas_registro = ?
    `, [registroAtleta]);

    reply.send(rows);
  } catch (err) {
    console.error(err);
    reply.status(500).send({ mensagem: "Erro ao buscar desempenho do atleta" });
  }
});
app.get('/atletas/:registroAtleta/time', async (request, reply) => {
  const { registroAtleta } = request.params as { registroAtleta: string };

  try {
    const [rows] = await conn.query(`
      SELECT 
        t.idTime,
        t.nome,
        t.sigla,
        adt.temporada
      FROM atletasDoTime adt
      JOIN times t ON adt.times_idTime = t.idTime
      WHERE adt.atletas_registro = ?
      ORDER BY adt.temporada DESC
      LIMIT 1
    `, [registroAtleta]);

    if (Array.isArray(rows) && rows.length > 0) {
      reply.send(rows[0]);
    } else {
      reply.status(404).send({ mensagem: "Time não encontrado para o atleta" });
    }
  } catch (err) {
    console.error(err);
    reply.status(500).send({ mensagem: "Erro ao buscar time do atleta" });
  }
});

app.get('/times/:idTime/campeonatos', async (request, reply) => {
  const { idTime } = request.params as { idTime: string };

  try {
    const [rows] = await conn.query(`
      SELECT 
        c.edicao,
        c.nome,
        c.localJogo
      FROM timesDoCampeonato tdc
      JOIN campeonatos c ON tdc.campeonatos_edicao = c.edicao
      WHERE tdc.times_idTime = ?
    `, [idTime]);

    if (Array.isArray(rows) && rows.length > 0) {
      reply.send(rows);
    } else {
      reply.status(404).send({ mensagem: "Campeonatos não encontrados para o time" });
    }
  } catch (err) {
    console.error(err);
    reply.status(500).send({ mensagem: "Erro ao buscar campeonatos do time" });
  }
});
app.get('/campeonatos/:edicao/jogos', async (request, reply) => {
  const { edicao } = request.params as { edicao: string };

  try {
    const [rows] = await conn.query(`
      SELECT 
        j.idJogo,
        j.quadra,
        j.dataJogo,
        j.timeCasa,
        j.timeFora,
        j.pontosCasa,
        j.pontosFora
      FROM jogosDoCampeonato jdc
      JOIN jogos j ON jdc.jogos_idJogo = j.idJogo
      WHERE jdc.campeonatos_edicao = ?
    `, [edicao]);

    if (Array.isArray(rows) && rows.length > 0) {
      reply.send(rows);
    } else {
      reply.status(404).send({ mensagem: "Jogos não encontrados para esse campeonato" });
    }
  } catch (err) {
    console.error(err);
    reply.status(500).send({ mensagem: "Erro ao buscar jogos do campeonato" });
  }
});
app.get('/jogos/:id', async (request, reply) => {
  const { id } = request.params as { id: string };

  try {
    const [rows] = await conn.query(`
      SELECT 
        j.idJogo,
        j.dataJogo,
        j.timeCasa,
        j.timeFora,
        t1.nome AS nomeCasa,
        t2.nome AS nomeFora
      FROM jogos j
      JOIN times t1 ON j.timeCasa = t1.idTime
      JOIN times t2 ON j.timeFora = t2.idTime
      WHERE j.idJogo = ?
    `, [id]);

    if (rows.length > 0) {
      reply.send(rows[0]);
    } else {
      reply.status(404).send({ mensagem: "Jogo não encontrado" });
    }
  } catch (err) {
    console.error(err);
    reply.status(500).send({ mensagem: "Erro ao buscar jogo" });
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