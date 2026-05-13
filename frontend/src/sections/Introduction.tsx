"use client";

import { useState, useEffect, useRef } from "react";
import { useScroll, useTransform } from "framer-motion";
import Tag from "@/components/Tag";
import { twMerge } from "tailwind-merge";

const text = `You want to freely capture ideas and data, but traditional note-taking apps leave you exposed to privacy breaches and lack strong encryption.`;
const words = text.split(" ");

export default function Introduction() {
  const scrollTarget = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: scrollTarget,
    offset: ["start end", "end end"],
  });

  const [currentWord, setCurrentWord] = useState(0);
  const wordIndex = useTransform(scrollYProgress, [0, 1], [0, words.length]);

  useEffect(() => {
    wordIndex.onChange((latest) => {
      setCurrentWord(latest);
    });
  }, [wordIndex]);

  return (
    <section className="py-28 lg:py-40">
      <div className="container">
        <div className="sticky top-20 md:top-28 lg:top-36">
          <div className="flex justify-center">
            <Tag>Introducing Secure-NoteBook</Tag>
          </div>
          <div className="text-4xl md:text-6xl lg:text-7xl text-center font-medium mt-10">
            <span className="">Your sensitive information deserves better.</span>{" "}
            <span>
              {words.map((word, wordIndex) => (
                <span
                  className={twMerge(
                    "transition duration-500 text-white/15",
                    wordIndex < currentWord && "text-white"
                  )}
                  key={wordIndex}
                >{`${word} `}</span>
              ))}
            </span>
            <span className="text-lime-400 block">
              That&apos;s why we built Secure-NoteBook.
            </span>
          </div>
        </div>
        <div className="h-[150vh]" ref={scrollTarget}></div>
      </div>
    </section>
  );
}
