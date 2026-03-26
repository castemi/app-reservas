/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="es" dir="ltr">
    <Head />
    <Preview>Confirma tu cambio de email en {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirma tu cambio de email</Heading>
        <Text style={text}>
          Has solicitado cambiar tu dirección de correo en {siteName} de{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          a{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={text}>
          Haz clic en el botón de abajo para confirmar este cambio:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmar cambio de email
        </Button>
        <Text style={footer}>
          Si no solicitaste este cambio, protege tu cuenta inmediatamente.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
const link = { color: 'inherit', textDecoration: 'underline' }
const button = {
  backgroundColor: '#1a1a1a',
  color: '#ffffff',
  fontSize: '15px',
  borderRadius: '6px',
  padding: '14px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
