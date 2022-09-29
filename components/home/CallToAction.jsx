import Image from 'next/future/image'

import { Button } from './Button'
import { Container } from './Container'
import backgroundImage from './images/background-call-to-action.jpg'

export function CallToAction() {
  return (
    <section
      id="get-started-today"
      className="relative overflow-hidden bg-blue-600 py-32"
    >
      <Image
        className="absolute top-1/2 left-1/2 max-w-none -translate-x-1/2 -translate-y-1/2"
        src={backgroundImage}
        alt=""
        width={2347}
        height={1244}
        unoptimized
      />
      <Container className="relative">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="font-display text-3xl tracking-tight text-white sm:text-4xl">
            Get started now
          </h2>
          <p className="mt-4 text-lg tracking-tight text-white">
            There is a very small platform fee (in TRX), paid at the time of signing the transaction, seamlessly integrated with the gas fee.
          </p>
          <Button href="/create" color="white" className="mt-10">
            Open App
          </Button>
        </div>
      </Container>
    </section>
  )
}
