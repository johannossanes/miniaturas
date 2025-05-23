import { PrismaClient } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'

const prisma = new PrismaClient()

const router = Router()

const alunoSchema = z.object({
  nome: z.string().min(10,
    { message: "Nome deve possuir, no mínimo, 10 caracteres" }),
  turma: z.string(),
  responsavel: z.string(),
  email: z.string().min(10,
    { message: "E-mail, no mínimo, 10 caracteres" }),
  obs: z.string().optional(),
})

router.get("/", async (req, res) => {
  try {
    const alunos = await prisma.aluno.findMany()
    res.status(200).json(alunos)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.post("/", async (req, res) => {

  const valida = alunoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { nome, turma, responsavel, email, obs } = valida.data

  try {
    const alunos = await prisma.aluno.create({
      data: { nome, turma, responsavel, email, obs }
    })
    res.status(201).json(alunos)
  } catch (error) {
    res.status(400).json({ error })
  }
})

router.delete("/:id", async (req, res) => {
  const { id } = req.params

  try {
    const aluno = await prisma.aluno.delete({
      where: { id: Number(id) }
    })
    res.status(200).json(aluno)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

router.put("/:id", async (req, res) => {
  const { id } = req.params

  const valida = alunoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { nome, turma, responsavel, obs } = valida.data

  try {
    const aluno = await prisma.aluno.update({
      where: { id: Number(id) },
      data: { nome, turma, responsavel, obs }
    })
    res.status(200).json(aluno)
  } catch (error) {
    res.status(400).json({ error })
  }
})

export default router
