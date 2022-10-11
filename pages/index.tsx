import Head from 'next/head'

import { CallToAction } from '../components/home/CallToAction'
import { Faqs } from '../components/home/Faqs'
import { Footer } from '../components/home/Footer'
import { Header } from '../components/home/Header'
import { Hero } from '../components/home/Hero'
import { Pricing } from '../components/home/Pricing'
import { PrimaryFeatures } from '../components/home/PrimaryFeatures'
import { SecondaryFeatures } from '../components/home/SecondaryFeatures'
import { Testimonials } from '../components/home/Testimonials'

export default function Home() {
  return (
    <>
      <Head>
        <title>Smart NFT invoicing for everyone</title>
        <meta
          name="description"
          content="Solves two huge problems on two very different fronts using Blockchain: Contractor Payments and Cyber Security"
        />
      </Head>
      <Header />
      <main>
        <Hero />
        <PrimaryFeatures />
        <SecondaryFeatures />
        <CallToAction />
        <Testimonials />
        {/* <Pricing /> */}
        <Faqs />
      </main>
      <Footer />
    </>
  )
}
