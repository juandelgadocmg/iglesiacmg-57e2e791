import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VoiceDictationButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  size?: "sm" | "default" | "icon";
}

export const VoiceDictationButton: React.FC<VoiceDictationButtonProps> = ({
  onTranscript,
  className,
  size = "sm",
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const toggleListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("El dictado por voz no está soportado en este navegador. Te recomendamos usar Google Chrome, Edge o Safari.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      toast.success("Grabación finalizada.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "es-CO"; // Español Colombia / Latinoamérica

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("🎙️ Escuchando... Dicta tus observaciones en voz alta.");
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            currentTranscript += result[0].transcript + " ";
          }
        }
        if (currentTranscript.trim()) {
          onTranscript(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition warning/error:", event.error);
        if (event.error !== "no-speech") {
          toast.error(`Error en dictado por voz: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Error starting speech recognition:", err);
      toast.error("No se pudo iniciar el micrófono.");
      setIsListening(false);
    }
  };

  return (
    <Button
      type="button"
      variant={isListening ? "destructive" : "outline"}
      size={size}
      onClick={toggleListening}
      className={cn(
        "gap-1.5 transition-all duration-300 font-medium",
        isListening && "animate-pulse ring-2 ring-red-500/50 shadow-lg bg-red-600 text-white hover:bg-red-700",
        className
      )}
      title={isListening ? "Detener dictado por voz" : "Dictar observaciones por voz (Micrófono)"}
    >
      {isListening ? (
        <>
          <MicOff className="h-4 w-4 animate-bounce text-white" />
          <span className="text-xs">Grabando... (Clic para parar)</span>
        </>
      ) : (
        <>
          <Mic className="h-4 w-4 text-primary" />
          <span className="text-xs">Dictar por voz</span>
        </>
      )}
    </Button>
  );
};
