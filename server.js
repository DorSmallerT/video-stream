const express = require("express")
const fs = require("fs")
const crypto = require("crypto")
const path = require("path")

const app = express()

const SECRET = "super-secret-123"

app.get("/generate/:file", (req, res) => {
  const fileName = req.params.file
  const expires = Date.now() + 3600000

  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(fileName + expires)
    .digest("base64url")

  res.send(
    `https://video-stream-8er6.onrender.com/v/${fileName}?expires=${expires}&sig=${sig}`
  )
})

app.get("/v/:file", (req, res) => {
  const fileName = req.params.file
  const { expires, sig } = req.query

  if (!expires || !sig) return res.sendStatus(403)
  if (Date.now() > Number(expires)) return res.sendStatus(403)

  const expectedSig = crypto
    .createHmac("sha256", SECRET)
    .update(fileName + expires)
    .digest("base64url")

  if (sig !== expectedSig) return res.sendStatus(403)

  const filePath = path.join(__dirname, fileName)

  if (!fs.existsSync(filePath)) return res.sendStatus(404)

  res.setHeader("Content-Type", "video/mp4")
  res.setHeader("Content-Disposition", "inline")

  fs.createReadStream(filePath).pipe(res)
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log("Server running"))
