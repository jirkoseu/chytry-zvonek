import { jwtVerify } from "jose"

const secret = new TextEncoder().encode(process.env.JWT_SECRET)

export async function verifyJwt(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch (err) {
    console.error("JWT verification failed:", err)
    return null
  }
}