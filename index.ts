import mysql from 'mysql2/promise';
import fastify from 'fastify';
import cors from '@fastify/cors';

const app = fastify();

app.register(cors);

// Interfaces para tipagem dos dados retornados do banco
interface AtletaResumo {
  registroAtleta: number;
  nome: string;
  nomeCamisa: string;
  numeroCamisa: number;
  posicao: string;
  altura: number;
  peso: number;
  idade: number;
}

interface AtletaDetalhado extends AtletaResumo {
  paisOrigem: string;
  estadoOrigem: string;
  cidadeOrigem: string;
}

interface MediaDesempenho {
  pontos: number;
  rebotes: number;
  assistencias: number;
  eficiencia: number;
}

interface Recorde {
  tipo: 'pontos' | 'rebotes' | 'assistencias';
  valor: number;
  dataJogo: string; // Pode ser Date, mas string simplifica o envio JSON
  adversario: string;
}

(async () => {
  // Conexão com banco de dados MySQL
  const conn = await mysql.createConnection({
    host: "localhost",
    user: 'root',
    password: "",
    database: 'JBB',
    port: 3306
  });

  // Rota para listar todos os atletas (resumo)
  app.get('/atletas', async (request, reply) => {
    try {
      const [rows] = await conn.query<AtletaResumo[]>(`
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

  // Rota para buscar atleta por registro com dados detalhados
  app.get('/atletas/:registroAtleta', async (request, reply) => {
    const { registroAtleta } = request.params as { registroAtleta: string };
    try {
      const [rows] = await conn.query<AtletaDetalhado[]>(`
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

      if (rows.length > 0) {
        reply.send(rows[0]);
      } else {
        reply.status(404).send({ mensagem: "Atleta não encontrado" });
      }
    } catch (err) {
      console.error(err);
      reply.status(500).send({ mensagem: "Erro no servidor" });
    }
  });

  // Rota para desempenho médio e recordes do atleta
  app.get('/atletas/:registroAtleta/desempenho', async (request, reply) => {
    const { registroAtleta } = request.params as { registroAtleta: string };

    try {
      // Médias dos principais atributos do atleta
      const [medias] = await conn.query<MediaDesempenho[]>(`
        SELECT 
          IFNULL(ROUND(AVG(pontos), 1), 0) AS pontos,
          IFNULL(ROUND(AVG(rebotes), 1), 0) AS rebotes,
          IFNULL(ROUND(AVG(assistencias), 1), 0) AS assistencias,
          IFNULL(ROUND(AVG(
            pontos + rebotes + assistencias + roubos + bloqueios 
            - turnovers 
            - (arremessosTentados - arremessosConvertidos)
            - (lancesLivresTentados - lancesLivresConvertidos)
          ), 1), 0) AS eficiencia
        FROM atletasEstatisticasJogos
        WHERE atletas_registro = ?
      `, [registroAtleta]);

      // Recordes máximos de pontos, rebotes e assistências com data e adversário
      const [recordes] = await conn.query<Recorde[]>(`
        SELECT 'pontos' AS tipo, pontos AS valor, jogos.dataJogo, times.nome AS adversario
        FROM atletasEstatisticasJogos
        JOIN jogos ON jogos.idJogo = atletasEstatisticasJogos.jogos_idJogo
        JOIN times ON 
          (jogos.timeCasa != (SELECT times_idTime FROM atletasDoTime WHERE atletas_registro = ? LIMIT 1) 
           AND jogos.timeCasa = times.idTime)
          OR
          (jogos.timeFora != (SELECT times_idTime FROM atletasDoTime WHERE atletas_registro = ? LIMIT 1)
           AND jogos.timeFora = times.idTime)
        WHERE atletas_registro = ?
        ORDER BY pontos DESC LIMIT 1

        UNION

        SELECT 'rebotes', rebotes, jogos.dataJogo, times.nome
        FROM atletasEstatisticasJogos
        JOIN jogos ON jogos.idJogo = atletasEstatisticasJogos.jogos_idJogo
        JOIN times ON 
          (jogos.timeCasa != (SELECT times_idTime FROM atletasDoTime WHERE atletas_registro = ? LIMIT 1) 
           AND jogos.timeCasa = times.idTime)
          OR
          (jogos.timeFora != (SELECT times_idTime FROM atletasDoTime WHERE atletas_registro = ? LIMIT 1)
           AND jogos.timeFora = times.idTime)
        WHERE atletas_registro = ?
        ORDER BY rebotes DESC LIMIT 1

        UNION

        SELECT 'assistencias', assistencias, jogos.dataJogo, times.nome
        FROM atletasEstatisticasJogos
        JOIN jogos ON jogos.idJogo = atletasEstatisticasJogos.jogos_idJogo
        JOIN times ON 
          (jogos.timeCasa != (SELECT times_idTime FROM atletasDoTime WHERE atletas_registro = ? LIMIT 1) 
           AND jogos.timeCasa = times.idTime)
          OR
          (jogos.timeFora != (SELECT times_idTime FROM atletasDoTime WHERE atletas_registro = ? LIMIT 1)
           AND jogos.timeFora = times.idTime)
        WHERE atletas_registro = ?
        ORDER BY assistencias DESC LIMIT 1
      `, [
        registroAtleta, registroAtleta, registroAtleta, 
        registroAtleta, registroAtleta,
        registroAtleta, registroAtleta,
        registroAtleta, registroAtleta
      ]);

      // Organiza os recordes num objeto chaveado pelo tipo
      const recordeFormatado: Record<string, { valor: number; data: string; adversario: string }> = {};
      for (const r of recordes) {
        recordeFormatado[r.tipo] = {
          valor: r.valor,
          data: r.dataJogo,
          adversario: r.adversario
        };
      }

      reply.send({
        medias: medias[0] || { pontos: 0, rebotes: 0, assistencias: 0, eficiencia: 0 },
        recordes: recordeFormatado
      });

    } catch (err) {
      console.error(err);
      reply.status(500).send({ mensagem: "Erro ao buscar desempenho do atleta" });
    }
  });

  // Inicializa servidor
  app.listen({ port: 8000 }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Servidor rodando em: ${address}`);
  });
})();
