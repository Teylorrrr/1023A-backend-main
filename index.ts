import mysql from "mysql2/promise";
import fastify from "fastify";
import cors from "@fastify/cors";

const app = fastify();

// Registrar CORS
app.register(cors, {
  origin: "*", // Permitir todas origens (ou configure seu domínio)
});

// Criar pool de conexões para melhor gerenciamento
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "JBB",
  port: 3306
});

(async () => {
  // Rotas

  // Pegar time pelo ID
  app.get("/times/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const [rows] = await pool.query(
        `
        SELECT
          id AS id,
          nome,
          sigla,
          cidade,
          estado,
          timeEscudo AS escudoUrl,
          dataCriacao
        FROM times
        WHERE id = ?
      `,
        [id]
      );

      if (Array.isArray(rows) && rows.length > 0) {
        reply.send(rows[0]);
      } else {
        reply.status(404).send({ mensagem: "Time não encontrado" });
      }
    } catch (err) {
      console.error(err);
      reply.status(500).send({ mensagem: "Erro no servidor" });
    }
  });

  // Listar todos os times
  app.get("/times", async (request, reply) => {
    try {
      const [rows] = await pool.query(
        `
        SELECT
          id AS id,
          nome,
          sigla,
          timeEscudo AS escudoUrl
        FROM times
      `
      );
      reply.send(rows);
    } catch (err) {
      console.error(err);
      reply.status(500).send({ mensagem: "Erro ao buscar times" });
    }
  });

  // Listar atletas
  app.get("/atletas", async (request, reply) => {
    try {
      const [rows] = await pool.query(
        `
        SELECT
          registro AS registroAtleta,
          nome,
          nomeCamisa,
          numeroCamisa,
          posicao,
          altura,
          peso,
          idade
        FROM atletas
      `
      );
      reply.send(rows);
    } catch (err) {
      console.error(err);
      reply.status(500).send({ mensagem: "Erro no servidor" });
    }
  });

  // Listar atletas de um time específico
  app.get("/atletas/time/:idTime", async (request, reply) => {
    const { idTime } = request.params as { idTime: string };

    try {
      const [rows] = await pool.query(
        `
      SELECT
        a.registro AS registroAtleta,
        a.nome,
        a.nomeCamisa,
        a.numeroCamisa,
        a.posicao,
        a.altura,
        a.peso,
        a.idade
      FROM atletas a
      JOIN atletasDoTime adt ON a.registro = adt.atletas_registro
      WHERE adt.times_id = ?
      ORDER BY adt.temporada DESC
      `,
        [idTime]
      );

      reply.send(rows);
    } catch (err) {
      console.error(err);
      reply.status(500).send({ mensagem: "Erro ao buscar atletas do time" });
    }
  });

  // Detalhar um atleta pelo registro
  app.get("/atletas/:registroAtleta", async (request, reply) => {
    const { registroAtleta } = request.params as { registroAtleta: string };
    try {
      const [rows] = await pool.query(
        `
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
          dataNascimento, 
          idade
        FROM atletas
        WHERE registro = ?
      `,
        [registroAtleta]
      );

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

  // Desempenho do atleta
  app.get("/atletas/:registroAtleta/desempenho", async (request, reply) => {
    const { registroAtleta } = request.params as { registroAtleta: string };
    try {
      const [rows] = await pool.query(
        `
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
      `,
        [registroAtleta]
      );

      reply.send(rows);
    } catch (err) {
      console.error(err);
      reply.status(500).send({ mensagem: "Erro ao buscar desempenho do atleta" });
    }
  });

  // Obter time atual do atleta
  app.get("/atletas/:registroAtleta/time", async (request, reply) => {
    const { registroAtleta } = request.params as { registroAtleta: string };

    try {
      const [rows] = await pool.query(
        `
        SELECT 
          t.id,
          t.nome,
          t.sigla,
          adt.temporada
        FROM atletasDoTime adt
        JOIN times t ON adt.times_id = t.id
        WHERE adt.atletas_registro = ?
        ORDER BY adt.temporada DESC
        LIMIT 1
      `,
        [registroAtleta]
      );

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

  // Cadastrar uma equipe (time)
  app.post("/times", async (request, reply) => {
    const equipe = request.body as {
      nome: string;
      sigla: string;
      cidade: string;
      estado: string;
      timeEscudo?: string;
      dataCriacao?: string;
    };

    try {
      await pool.query(
        `INSERT INTO times (nome, sigla, cidade, estado, timeEscudo, dataCriacao)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          equipe.nome,
          equipe.sigla,
          equipe.cidade,
          equipe.estado,
          equipe.timeEscudo || null,
          equipe.dataCriacao || null,
        ]
      );

      reply.status(201).send({ mensagem: "Equipe cadastrada com sucesso" });
    } catch (error) {
      console.error("Erro ao cadastrar equipe:", error);
      reply.status(500).send({ mensagem: "Erro interno ao cadastrar equipe" });
    }
  });

  // Cadastrar atleta
  app.post("/atletas", async (request, reply) => {
    const atleta = request.body as {
      registro: number;
      nome: string;
      nomeCamisa: string;
      numeroCamisa: number;
      posicao: number;
      altura: number;
      peso: number;
      idade: number;
      paisOrigem?: string;
      estadoOrigem?: string;
      cidadeOrigem?: string;
      saltoVertical?: number;
      envergadura?: number;
      dataNascimento?: string;
    };

    // Validação básica
    if (
      !atleta.registro ||
      !atleta.nome ||
      !atleta.nomeCamisa ||
      !atleta.numeroCamisa ||
      !atleta.posicao
    ) {
      reply.status(400).send({ mensagem: "Campos obrigatórios faltando" });
      return;
    }

    try {
      await pool.query(
        `INSERT INTO atletas (
          registro, nome, nomeCamisa, numeroCamisa, posicao, altura, peso, idade,
          paisOrigem, estadoOrigem, cidadeOrigem, saltoVertical, envergadura, dataNascimento
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          atleta.registro,
          atleta.nome,
          atleta.nomeCamisa,
          atleta.numeroCamisa,
          atleta.posicao,
          atleta.altura,
          atleta.peso,
          atleta.idade,
          atleta.paisOrigem || null,
          atleta.estadoOrigem || null,
          atleta.cidadeOrigem || null,
          atleta.saltoVertical || null,
          atleta.envergadura || null,
          atleta.dataNascimento || null,
        ]
      );

      reply.status(201).send({ mensagem: "Atleta cadastrado com sucesso" });
    } catch (err) {
      console.error(err);
      reply.status(500).send({ mensagem: "Erro ao cadastrar atleta" });
    }
  });

  // Cadastrar estatísticas do jogo para atleta
  app.post("/atletas/:registroAtleta/desempenho", async (request, reply) => {
    const { registroAtleta } = request.params as { registroAtleta: string };

    const estatisticas = request.body as {
      jogos_idJogo: number;
      minutosJogador: number;
      pontos: number;
      assistencias: number;
      rebotes: number;
      bloqueios: number;
      roubos: number;
      turnovers: number;
      faltasCometidas: number;
      arremessosConvertidos: number;
      arremessosTentados: number;
      lancesLivresConvertidos: number;
      lancesLivresTentados: number;
      bolasTresConvertidas: number;
      bolasTresTentadas: number;
    };

    if (
      !estatisticas.jogos_idJogo ||
      estatisticas.minutosJogador === undefined ||
      estatisticas.pontos === undefined
    ) {
      reply.status(400).send({ mensagem: "Campos obrigatórios faltando" });
      return;
    }

    try {
      await pool.query(
        `INSERT INTO atletasEstatisticasJogos (
          atletas_registro,
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          registroAtleta,
          estatisticas.jogos_idJogo,
          estatisticas.minutosJogador,
          estatisticas.pontos,
          estatisticas.assistencias,
          estatisticas.rebotes,
          estatisticas.bloqueios,
          estatisticas.roubos,
          estatisticas.turnovers,
          estatisticas.faltasCometidas,
          estatisticas.arremessosConvertidos,
          estatisticas.arremessosTentados,
          estatisticas.lancesLivresConvertidos,
          estatisticas.lancesLivresTentados,
          estatisticas.bolasTresConvertidas,
          estatisticas.bolasTresTentadas,
        ]
      );
      reply.status(201).send({ mensagem: "Estatísticas cadastradas com sucesso" });
    } catch (err) {
      console.error(err);
      reply.status(500).send({ mensagem: "Erro ao cadastrar estatísticas" });
    }
  });

      // Deletar atleta
app.delete("/atletas/:registroAtleta", async (request, reply) => {
  const { registroAtleta } = request.params as { registroAtleta: string };

  try {
    // Verifica se existe
    const [check] = await pool.query(`SELECT * FROM atletas WHERE registro = ?`, [registroAtleta]);
    if ((check as any[]).length === 0) {
      return reply.status(404).send({ mensagem: "Atleta não encontrado" });
    }

    // Deleta possíveis estatísticas e vínculos antes
    await pool.query(`DELETE FROM atletasEstatisticasJogos WHERE atletas_registro = ?`, [registroAtleta]);
    await pool.query(`DELETE FROM atletasDoTime WHERE atletas_registro = ?`, [registroAtleta]);

    // Agora deleta o atleta
    await pool.query(`DELETE FROM atletas WHERE registro = ?`, [registroAtleta]);
    reply.send({ mensagem: "Atleta deletado com sucesso" });
  } catch (err) {
    console.error("Erro ao deletar atleta:", err);
    reply.status(500).send({ mensagem: "Erro interno ao deletar atleta" });
  }
});

// Deletar time
app.delete("/times/:id", async (request, reply) => {
  const { id } = request.params as { id: string };

  try {
    const [check] = await pool.query(`SELECT * FROM times WHERE id = ?`, [id]);
    if ((check as any[]).length === 0) {
      return reply.status(404).send({ mensagem: "Time não encontrado" });
    }

    // Remove relacionamentos e dependências primeiro
    await pool.query(`DELETE FROM atletasDoTime WHERE times_id = ?`, [id]);
    await pool.query(`DELETE FROM equipesEstatisticasJogos WHERE times_id = ?`, [id]);
    await pool.query(`DELETE FROM resultadoJogo WHERE times_id = ?`, [id]);
    await pool.query(`DELETE FROM jogos WHERE timeCasa = ? OR timeFora = ?`, [id, id]);
    await pool.query(`DELETE FROM timesDoCampeonato WHERE times_id = ?`, [id]);

    // Agora deleta o time
    await pool.query(`DELETE FROM times WHERE id = ?`, [id]);
    reply.send({ mensagem: "Time deletado com sucesso" });
  } catch (err) {
    console.error("Erro ao deletar time:", err);
    reply.status(500).send({ mensagem: "Erro interno ao deletar time" });
  }
});
  // Iniciar servidor na porta 8000
  app.listen({ port: 8000 }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Servidor rodando em: ${address}`);
  });
})();
