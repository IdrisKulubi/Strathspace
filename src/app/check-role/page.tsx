
//check if the user is an admin

import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function CheckRole() {
  const session = await auth();


    if (!session) {
        return redirect("/sign-in");
    }


    if (session.user.role !== "admin") {
        return <div>You are not authorized to access this page</div>;
    }

    return <div>Admin</div>;
}


