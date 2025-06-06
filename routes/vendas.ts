import { PrismaClient, Tipos } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import nodemailer from 'nodemailer'


const prisma = new PrismaClient()

const router = Router()

const vendaSchema = z.object({
  clienteId: z.number(),
  miniaturasIds: z.array(z.number()).nonempty("Deve ter pelo menos uma miniatura")
})

function gerarTabelaHTML(dados: any) {
  // Código Inicial, Dados do Aluno e Responsável, Cabeçalho da Tabela
  let html = `
    <html>
    <body style="font-family: Helvetica, Arial, sans-serif;">
    <h2>Relatório de Vendas Brid's</h2>
    <h3>Cliente: ${dados.nome}</h3>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <thead style="background-color: rgb(195, 191, 191);">
        <tr>
          <th>Data e Hora</th>
          <th>Produtos</th>
          <th>Valor Unitário R$</th>
        </tr>
      </thead>
      <tbody>
  `;

  // Lançamentos de Vendas
  let totalVendas = 0;
  for (const venda of dados.vendas) {
    // totalVendas += Number(venda.precoTotal)

    const data = new Date(venda.data)

    const dataFormatada = data.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    const nomesMiniaturas = venda.miniaturas.map((m: { personagem: string }) => m.personagem).join(", ");
    const totalVenda = Number(venda.precoTotal);
    totalVendas += totalVenda;

    html += `
      <tr>
        <td>${dataFormatada}</td>
        <td>${nomesMiniaturas}</td>
        <td style="text-align: right;">${totalVenda.toLocaleString("pt-br", { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  }

  // Rodapé com totais
  html += `
      <tr style="font-weight: bold; background-color:rgb(235, 232, 232);">
        <td colspan="2" style="text-align: right;">Total:</td>
        <td style="text-align: right;">R$ ${totalVendas.toLocaleString("pt-br", { minimumFractionDigits: 2 })}</td>
      </tr>
    </tbody>
    </table>
    </body>
    </html>
  `;

  return html;
}

const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: " ",
    pass: " ",
  },
});



async function enviaEmail(dados: any) {
  const mensagem = gerarTabelaHTML(dados)

  const info = await transporter.sendMail({
    from: 'Brids Miniaturas <artistabrids@gmail.email>',
    to: dados.email,
    subject: "Compra de Miniatura",
    text: "Obrigado por comprar...", // plain‑text body
    html: mensagem, // HTML body
  });

  console.log("Message sent:", info.messageId);
  
}
router.get("/", async (req, res) => {
  try {
    const vendas = await prisma.venda.findMany({
      include: {
        cliente: true,
        miniaturas: true,
      }
    })
    res.status(200).json(vendas)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.post("/", async (req, res) => {

  const valida = vendaSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { clienteId, miniaturasIds } = valida.data

  //pesquisa para obter registro do cliente (recebe-se apenas id)
  const dadoCliente = await prisma.cliente.findUnique({
    where: { id: clienteId}
  })

  const miniaturas = await prisma.miniatura.findMany({
    where: {id: { in: miniaturasIds}}
  })

  if (miniaturas.length !== miniaturasIds.length) {
    res.status(400).json({ erro: "Alguma miniatura inválida" })
    return
  }

  if (!dadoCliente) {
    res.status(400).json({ erro: "Erro... Codigo do cliente inválido" })
    return
  }

  const subtotal = miniaturas.reduce((acc, m) => acc + Number(m.preco), 0)

  const clienteComVendas = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: { vendas: { include: { miniaturas: true }
      }
    }
  })

  if (!clienteComVendas) {
    return res.status(404).json({ erro: "Cliente não encontrado para enviar e-mail." })
  }

  try {
    const [venda, cliente, ...miniaturasAtualizadas ] = await prisma.$transaction([
      prisma.venda.create({ 
        data: { clienteId, precoTotal: subtotal, miniaturas: {connect: miniaturasIds.map(id => ({ id }))} } 
      }),
      prisma.cliente.update({
        where: { id: clienteId },
        data: { divida: { increment: subtotal} }
      }),
      ...miniaturas.map( mini => prisma.miniatura.update ({
        where: { id: mini.id },
        data: { status: "Vendido" }
      }))
    ])
     const clienteComVendas = await prisma.cliente.findUnique({
      where: { id: clienteId },
        include: { vendas: { include: { miniaturas: true } } }
      })

      if (clienteComVendas) {
        await enviaEmail(clienteComVendas)
      }
    res.status(201).json({ venda, cliente })

  } catch (error) {
    res.status(400).json({ error })
  }
})

router.post("/pagar", async (req, res) => {
  const { clienteId, valor } = req.body

  if (!clienteId || !valor || valor <= 0) {
    return res.status(400).json({ erro: "Dados inválidos." })
  }

  try {
    const cliente = await prisma.cliente.update({
      where: { id: clienteId },
      data: { divida: { decrement: valor } }
    })

    res.status(200).json({ mensagem: "Dívida paga com sucesso.", cliente })
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

router.delete("/:id", async (req, res) => {
  const { id } = req.params


  try {

    const vendaExcluida = await prisma.venda.findUnique({ 
      where: { id: Number(id) },
      include: { miniaturas: true }
    })

    if (!vendaExcluida) {
      return res.status(404).json({ erro: "Venda não encontrada" })
    }

    const miniaturasIds = vendaExcluida.miniaturas.map(m => m.id)

    const [venda, cliente, miniatura] = await prisma.$transaction([
      prisma.venda.delete({ where: { id: Number(id) } }),
      prisma.cliente.update({
        where: { id: vendaExcluida?.clienteId },
        data: { divida: { decrement: vendaExcluida?.precoTotal } }
      }),
      ...miniaturasIds.map( id => prisma.miniatura.update({
        where: { id },
        data: { status: "Descontinuada" }
      }))
    ])

    res.status(200).json({ venda, cliente, miniatura })
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

export default router
