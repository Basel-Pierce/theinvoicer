import Image from 'next/future/image'
import Link from 'next/link'

import { Container } from './Container'
import backgroundImage from './images/background-faqs.jpg'

const faqs = [
  [
    {
      question: 'How te create a Tron Link wallet extension?',
      answer:
        'https://youtu.be/Xu-lmkGtzs4',
    },
    {
      question: 'How to create an invoice with TronLink extension?',
      answer: 'https://youtu.be/feMOz2KrmZg',
    },
    {
      question: 'How to pay an invoice?',
      answer:
        'https://youtu.be/vWCtFfnKw48',
    },
  ],
  [
    {
      question: 'How to create a Tron Link Wallet in mobile?',
      answer:
        'https://youtu.be/-B-tnUcTuHo',
    },
    {
      question:
        'How te create an invoice with a mobile device?',
      answer:
        'https://youtu.be/qClvvvNfaek',
    },
    {
      question:
        'How to pay an invoice with a mobile device?',
      answer:
        'https://youtu.be/dUTgU-Sw6x8',
    },
  ]
]

export function Faqs() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="relative overflow-hidden bg-slate-50 py-20 sm:py-32"
    >
      <Image
        className="absolute top-0 left-1/2 max-w-none translate-x-[-30%] -translate-y-1/4"
        src={backgroundImage}
        alt=""
        width={1558}
        height={946}
        unoptimized
      />
      <Container className="relative">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2
            id="faq-title"
            className="font-display text-3xl tracking-tight text-slate-900 sm:text-4xl"
          >
            Frequently asked questions
          </h2>
          <p className="mt-4 text-lg tracking-tight text-slate-700">
            If you can’t find what you’re looking for, email our support team.
          </p>
        </div>
        <ul
          role="list"
          className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-2"
        >
          {faqs.map((column, columnIndex) => (
            <li key={columnIndex}>
              <ul role="list" className="flex flex-col gap-y-8">
                {column.map((faq, faqIndex) => (
                  <li key={faqIndex}>
                    <h3 className="font-display text-lg leading-7 text-slate-900">
                      {faq.question}
                    </h3>
                    <p className="mt-4 text-sm text-slate-700"><Link href={faq.answer}>View Video</Link></p>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
