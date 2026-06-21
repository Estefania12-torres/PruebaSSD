const express = require('express');
const router = express.Router();

// Outbound Adapters
const KnexDatabaseAdapter = require('../../out/database/KnexDatabaseAdapter');
const N8nHttpAdapter = require('../../out/orchestrator/N8nHttpAdapter');
const LocalRAGEngineAdapter = require('../../out/rag/LocalRAGEngineAdapter');

// Use Cases
const AskUseCase = require('../../../core/useCases/AskUseCase');
const BuildRagUseCase = require('../../../core/useCases/BuildRagUseCase');
const ExecuteSqlUseCase = require('../../../core/useCases/ExecuteSqlUseCase');
const RunRawQueryUseCase = require('../../../core/useCases/RunRawQueryUseCase');

// Controllers
const AskController = require('./controllers/AskController');
const DbController = require('./controllers/DbController');
const RagController = require('./controllers/RagController');

// Instantiate adapters
const databaseAdapter = new KnexDatabaseAdapter();
const orchestratorAdapter = new N8nHttpAdapter();
const ragAdapter = new LocalRAGEngineAdapter('./data/rag');

// Instantiate use cases
const askUseCase = new AskUseCase(orchestratorAdapter, ragAdapter, databaseAdapter);
const buildRagUseCase = new BuildRagUseCase(databaseAdapter, ragAdapter);
const executeSqlUseCase = new ExecuteSqlUseCase(databaseAdapter);
const runRawQueryUseCase = new RunRawQueryUseCase(databaseAdapter);

// Instantiate controllers
const askController = new AskController(askUseCase);
const dbController = new DbController(executeSqlUseCase, runRawQueryUseCase);
const ragController = new RagController(buildRagUseCase);

// Routes
router.post('/v1/ask', (req, res, next) => askController.ask(req, res, next));
router.post('/v1/rag/build', (req, res, next) => ragController.build(req, res, next));
router.post('/execute', (req, res, next) => dbController.execute(req, res, next));
router.post('/query', (req, res, next) => dbController.query(req, res, next));

module.exports = router;
