import { Router } from 'express'
import { CCTPController } from '../controllers/cctpController'

const router = Router()
const cctpController = new CCTPController()

// CCTP Transfer Routes
router.post('/transfer', cctpController.initiateTransfer.bind(cctpController))
router.get('/attestation/:sourceChain/:txHash', cctpController.getAttestation.bind(cctpController))
router.post('/complete', cctpController.completeTransfer.bind(cctpController))
router.get('/min-fee/:chainId/:amount', cctpController.getMinimumFee.bind(cctpController))
router.get('/status/:sourceChain/:txHash', cctpController.getTransferStatus.bind(cctpController))

// Transaction Management Routes
router.get('/transactions', cctpController.getAllTransactions.bind(cctpController))
router.get('/transactions/:transactionId', cctpController.getTransactionById.bind(cctpController))

export { router as cctpRoutes }
