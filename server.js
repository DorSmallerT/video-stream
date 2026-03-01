const express = require("express")
const fs = require("fs")
const crypto = require("crypto")
const path = require("path")

const app = express()

const SECRET = "super-secret-123"

app.get("/generate/:file", (req, res) => {
  const fileName = req.params.file
  const ONE_WEEK = 7 * 24 * 60 * 60 * 1000; // 604800000 ms
  const expires = Date.now() + ONE_WEEK;

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

  const stat = fs.statSync(filePath)
  const fileSize = stat.size
  const range = req.headers.range

  if (!range) {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
    })
    fs.createReadStream(filePath).pipe(res)
  } else {
    const parts = range.replace(/bytes=/, "").split("-")
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
    const chunkSize = end - start + 1

    const file = fs.createReadStream(filePath, { start, end })

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4",
    })

    file.pipe(res)
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log("Server running"))
