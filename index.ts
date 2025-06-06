import express from 'express'
import routesMiniaturas from "./routes/miniaturas"
import routesClientes from "./routes/cliente"
import routesVendas from "./routes/vendas"

const app = express()
const port = 3000

app.use(express.json())

app.use("/miniaturas", routesMiniaturas)
app.use("/clientes", routesClientes)
app.use("/vendas", routesVendas)

app.get('/', (req, res) => {
  res.send('API Brids - Miniaturas')
})

app.listen(port, () => {
  console.log(`Servidor rodando na porta: ${port}`)
})