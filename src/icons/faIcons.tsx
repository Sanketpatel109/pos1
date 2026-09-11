import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleExclamation,
  faTriangleExclamation,
  faCircleDown,
  faArrowDown,
  faArrowLeft,
  faArrowRight,
  faRightLeft,
  faCircleUp,
  faArrowUpRightFromSquare,
  faMoneyBill,
  faChartSimple,
  faBarcode,
  faTowerBroadcast,
  faBookOpen,
  faBuilding,
  faCalculator,
  faCalendarDays,
  faCamera,
  faCheck,
  faCheckDouble,
  faCircleCheck,
  faChevronDown,
  faChevronRight,
  faChevronUp,
  faClock,
  faCloud,
  faMugHot,
  faCoins,
  faCopy,
  faCreditCard,
  faDatabase,
  faDeleteLeft,
  faDollarSign,
  faDownload,
  faPenToSquare,
  faPen,
  faEye,
  faFileExcel,
  faFileLines,
  faFilter,
  faHashtag,
  faCircleQuestion,
  faCircleInfo,
  faKey,
  faKeyboard,
  faLayerGroup,
  faSpinner,
  faLock,
  faRightFromBracket,
  faExpand,
  faBars,
  faBottleWater,
  faCompress,
  faMinus,
  faBox,
  faBoxOpen,
  faCirclePause,
  faPercent,
  faPhone,
  faPlay,
  faPlus,
  faPrint,
  faQrcode,
  faReceipt,
  faArrowsRotate,
  faRotateLeft,
  faFloppyDisk,
  faScaleBalanced,
  faMagnifyingGlass,
  faPaperPlane,
  faGear,
  faSliders,
  faShareNodes,
  faShield,
  faShieldHalved,
  faBagShopping,
  faCartShopping,
  faMobileScreen,
  faWandMagicSparkles,
  faCodeFork,
  faTag,
  faTerminal,
  faTrashCan,
  faArrowTrendUp,
  faTruck,
  faUpload,
  faUser,
  faUserCheck,
  faUsers,
  faUtensils,
  faVault,
  faVolumeHigh,
  faVolumeXmark,
  faWallet,
  faPlane,
  faXmark,
  faBolt,
  faStar,
  faLightbulb,
  faPause,
  faComment,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';

export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  className?: string;
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
}

export function createFaComponent(def: IconDefinition, defaultSpin = false) {
  const Comp = React.forwardRef<SVGSVGElement, IconProps>(
    ({ className = '', size, color, strokeWidth, style, ...props }, ref) => {
      const combinedStyle: React.CSSProperties = {
        ...style,
        ...(color ? { color } : {}),
        ...(size ? { width: size, height: size } : {}),
      };

      return (
        <FontAwesomeIcon
          ref={ref}
          icon={def}
          spin={defaultSpin}
          className={className}
          style={combinedStyle}
          {...props}
        />
      );
    }
  );
  Comp.displayName = `FA_${def.iconName}`;
  return Comp;
}

// Re-export FontAwesome core tools
export { FontAwesomeIcon };
export * from '@fortawesome/free-solid-svg-icons';

// Standard 1-to-1 FontAwesome Free Solid Replacements
export const AlertCircle = createFaComponent(faCircleExclamation);
export const AlertTriangle = createFaComponent(faTriangleExclamation);
export const ArrowDownCircle = createFaComponent(faCircleDown);
export const ArrowDownLeft = createFaComponent(faArrowDown);
export const ArrowLeft = createFaComponent(faArrowLeft);
export const ArrowRight = createFaComponent(faArrowRight);
export const ArrowRightLeft = createFaComponent(faRightLeft);
export const ArrowUpCircle = createFaComponent(faCircleUp);
export const ArrowUpRight = createFaComponent(faArrowUpRightFromSquare);
export const Banknote = createFaComponent(faMoneyBill);
export const BarChart3 = createFaComponent(faChartSimple);
export const Barcode = createFaComponent(faBarcode);
export const Bluetooth = createFaComponent(faTowerBroadcast);
export const BookOpen = createFaComponent(faBookOpen);
export const Building = createFaComponent(faBuilding);
export const Calculator = createFaComponent(faCalculator);
export const Calendar = createFaComponent(faCalendarDays);
export const Camera = createFaComponent(faCamera);
export const Check = createFaComponent(faCheck);
export const CheckCheck = createFaComponent(faCheckDouble);
export const CheckCircle = createFaComponent(faCircleCheck);
export const CheckCircle2 = createFaComponent(faCircleCheck);
export const ChevronDown = createFaComponent(faChevronDown);
export const ChevronRight = createFaComponent(faChevronRight);
export const ChevronUp = createFaComponent(faChevronUp);
export const Clock = createFaComponent(faClock);
export const Cloud = createFaComponent(faCloud);
export const Coffee = createFaComponent(faMugHot);
export const Coins = createFaComponent(faCoins);
export const Copy = createFaComponent(faCopy);
export const CreditCard = createFaComponent(faCreditCard);
export const Database = createFaComponent(faDatabase);
export const Delete = createFaComponent(faDeleteLeft);
export const DollarSign = createFaComponent(faDollarSign);
export const Download = createFaComponent(faDownload);
export const Edit2 = createFaComponent(faPenToSquare);
export const Edit3 = createFaComponent(faPen);
export const ExternalLink = createFaComponent(faArrowUpRightFromSquare);
export const Eye = createFaComponent(faEye);
export const FileSpreadsheet = createFaComponent(faFileExcel);
export const FileText = createFaComponent(faFileLines);
export const Filter = createFaComponent(faFilter);
export const Hash = createFaComponent(faHashtag);
export const HelpCircle = createFaComponent(faCircleQuestion);
export const Info = createFaComponent(faCircleInfo);
export const KeyRound = createFaComponent(faKey);
export const Keyboard = createFaComponent(faKeyboard);
export const Layers = createFaComponent(faLayerGroup);
export const Loader2 = createFaComponent(faSpinner, true);
export const Lock = createFaComponent(faLock);
export const LogOut = createFaComponent(faRightFromBracket);
export const Maximize2 = createFaComponent(faExpand);
export const Menu = createFaComponent(faBars);
export const Milk = createFaComponent(faBottleWater);
export const Minimize2 = createFaComponent(faCompress);
export const Minus = createFaComponent(faMinus);
export const Package = createFaComponent(faBox);
export const PackageOpen = createFaComponent(faBoxOpen);
export const PackagePlus = createFaComponent(faBox);
export const PauseCircle = createFaComponent(faCirclePause);
export const Percent = createFaComponent(faPercent);
export const Phone = createFaComponent(faPhone);
export const Play = createFaComponent(faPlay);
export const Plus = createFaComponent(faPlus);
export const Printer = createFaComponent(faPrint);
export const QrCode = createFaComponent(faQrcode);
export const Radio = createFaComponent(faTowerBroadcast);
export const Receipt = createFaComponent(faReceipt);
export const RefreshCw = createFaComponent(faArrowsRotate);
export const RotateCcw = createFaComponent(faRotateLeft);
export const Save = createFaComponent(faFloppyDisk);
export const Scale = createFaComponent(faScaleBalanced);
export const Scan = createFaComponent(faBarcode);
export const Search = createFaComponent(faMagnifyingGlass);
export const Send = createFaComponent(faPaperPlane);
export const Settings = createFaComponent(faGear);
export const Settings2 = createFaComponent(faSliders);
export const Share2 = createFaComponent(faShareNodes);
export const Shield = createFaComponent(faShield);
export const ShieldAlert = createFaComponent(faShieldHalved);
export const ShieldCheck = createFaComponent(faShieldHalved);
export const ShoppingBag = createFaComponent(faBagShopping);
export const ShoppingCart = createFaComponent(faCartShopping);
export const Sliders = createFaComponent(faSliders);
export const Smartphone = createFaComponent(faMobileScreen);
export const Sparkles = createFaComponent(faWandMagicSparkles);
export const Split = createFaComponent(faCodeFork);
export const Tag = createFaComponent(faTag);
export const Terminal = createFaComponent(faTerminal);
export const Trash2 = createFaComponent(faTrashCan);
export const TrendingUp = createFaComponent(faArrowTrendUp);
export const Truck = createFaComponent(faTruck);
export const Upload = createFaComponent(faUpload);
export const User = createFaComponent(faUser);
export const UserCheck = createFaComponent(faUserCheck);
export const Users = createFaComponent(faUsers);
export const UtensilsCrossed = createFaComponent(faUtensils);
export const Vault = createFaComponent(faVault);
export const Volume2 = createFaComponent(faVolumeHigh);
export const VolumeX = createFaComponent(faVolumeXmark);
export const Wallet = createFaComponent(faWallet);
export const WifiOff = createFaComponent(faPlane);
export const X = createFaComponent(faXmark);
export const Zap = createFaComponent(faBolt);
export const Star = createFaComponent(faStar);
export const Lightbulb = createFaComponent(faLightbulb);
export const Pause = createFaComponent(faPause);
export const Comment = createFaComponent(faComment);
