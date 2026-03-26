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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Restablece tu contraseña en {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Restablece tu contraseña</Heading>
        <Text style={text}>
          Hemos recibido una solicitud para restablecer tu contraseña en{' '}
          {siteName}. Haz clic en el botón de abajo para elegir una nueva
          contraseña.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Restablecer contraseña
        </Button>
        <Text style={footer}>
          Si no solicitaste un cambio de contraseña, puedes ignorar este
          correo. Tu contraseña no será modificada.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
