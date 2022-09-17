import {
  DocumentPlusIcon,
  DocumentDuplicateIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";

export const navigation = [
  { name: "Create", href: "/create", icon: DocumentPlusIcon, current: false },
  {
    name: "Invoices",
    href: "/invoices",
    icon: DocumentDuplicateIcon,
    current: false,
  },
  {
    name: "FAQ",
    href: "/faq",
    icon: QuestionMarkCircleIcon,
    current: false,
  },
];

export const userNavigation = [
  { name: "Your Profile", href: "#" },
  { name: "Settings", href: "#" },
  { name: "Sign out", href: "#" },
];
