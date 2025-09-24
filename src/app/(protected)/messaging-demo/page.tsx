import { MessagingContainer } from "@/components/messaging";

export default function MessagingDemoPage() {
  return (
    <div className="container mx-auto p-4 h-screen">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Messaging System Demo</h1>
        <p className="text-muted-foreground">
          Complete messaging interface with conversation list and navigation
        </p>
      </div>
      
      <div className="h-[calc(100vh-120px)] border rounded-lg overflow-hidden">
        <MessagingContainer />
      </div>
    </div>
  );
}