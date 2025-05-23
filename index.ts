import express from 'express'
import routesProdutos from "./routes/produtos"
import routesAlunos from "./routes/alunos"
import routesDepositos from "./routes/depositos"
import routesVendas from "./routes/vendas"

const app = express()
const port = 3000

app.use(express.json())

app.use("/produtos", routesProdutos)
app.use("/alunos", routesAlunos)
app.use("/depositos", routesDepositos)
app.use("/vendas", routesVendas)

app.get('/', (req, res) => {
  res.send('API Cantina')
})

app.listen(port, () => {
  console.log(`Servidor rodando na porta: ${port}`)
})