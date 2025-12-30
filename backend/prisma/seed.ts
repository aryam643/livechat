import { prisma } from "../src/db.js";
import { randomUUID } from "crypto";

async function main() {
  const existing = await prisma.faq.count();
  if (existing > 0) return;

  await prisma.faq.createMany({
    data: [
      {
        id: randomUUID(),
        question: "What is your shipping policy?",
        answer:
          "We ship within India in 1–3 business days. International shipping (USA/UK/EU) takes 7–12 business days. Orders over ₹1999 ship free in India."
      },
      {
        id: randomUUID(),
        question: "Do you ship to USA?",
        answer:
          "Yes. USA delivery typically takes 7–12 business days. Customs duties (if any) are paid by the customer."
      },
      {
        id: randomUUID(),
        question: "What is your return/refund policy?",
        answer:
          "Returns accepted within 7 days of delivery for unused items in original packaging. Refunds are processed to the original payment method within 5–7 business days after pickup/inspection."
      },
      {
        id: randomUUID(),
        question: "What are your support hours?",
        answer:
          "Support is available Mon–Sat, 10:00 AM to 7:00 PM IST. You can leave a message anytime and we’ll respond during working hours."
      }
    ]
  });

  console.log("Seeded FAQ data.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
