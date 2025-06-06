import { PrismaClient } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'

const prisma = new PrismaClient()

const router = Router()

const miniaturaSchema = z.object({
  personagem: z.string().min(4,
    { message: "Nome do personagem deve possuir, no mínimo, 4 caracteres" }),
  tamanho: z.number(),
  preco: z.number(),
  obs: z.string().optional(),
  previsao: z.coerce.date()

})

router.get("/", async (req, res) => {
  try {
    const miniaturas = await prisma.miniatura.findMany()
    res.status(200).json(miniaturas)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.post("/", async (req, res) => {

  const valida = miniaturaSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { personagem, tamanho, preco, previsao, obs} = valida.data

  try {
    const miniatura = await prisma.miniatura.create({
      data: { personagem, tamanho, preco, previsao, obs }
    })
    res.status(201).json(miniatura)
  } catch (error) {
    res.status(400).json({ error })
  }
})

router.delete("/:id", async (req, res) => {
  const { id } = req.params

  try {
    const miniaturas = await prisma.miniatura.delete({
      where: { id: Number(id) }
    })
    res.status(200).json(miniaturas)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

router.put("/:id", async (req, res) => {
  const { id } = req.params

  const valida = miniaturaSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { personagem, tamanho, preco, previsao, obs } = valida.data

  try {
    const miniatura = await prisma.miniatura.update({
      where: { id: Number(id) },
      data: { personagem, tamanho, preco, previsao, obs}
    })
    res.status(200).json(miniatura)
  } catch (error) {
    res.status(400).json({ error })
  }
})

export default router
