/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Tu enlace de acceso para {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Tu enlace de acceso</Heading>
        <Text style={text}>
          Haz clic en el botón de abajo para iniciar sesión en {siteName}.
          Este enlace expirará en breve.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Iniciar sesión
        </Button>
        <Text style={footer}>
          Si no solicitaste este enlace, puedes ignorar este correo.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#faf8f5', fontFamily: "'Georgia', serif" }
const container = { padding: '30px 25px', maxWidth: '600px', margin: '0 auto' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#1a1a1a',
  margin: '0 0 20px',
  borderBottom: '2px solid #c8a97e',
  paddingBottom: '12px',
}
const text = {
  fontSize: '15px',
  color: '#4a4a4a',
  lineHeight: '1.6',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#1a1a1a',
  color: '#ffffff',
  fontSize: '15px',
  borderRadius: '6px',
  padding: '14px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
