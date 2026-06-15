import { Link } from 'react-router-dom'
import { Bot, Mail, Phone, MapPin, Send, Share2 } from 'lucide-react'
import { motion } from 'framer-motion'
import FooterLink from '../ui/FooterLink'
import SocialIcon from '../ui/SocialIcon'

export default function Footer() {
  return (
    <footer className="bg-dark text-slate-300 pt-16 pb-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center"
              >
                <Bot className="w-6 h-6 text-white" />
              </motion.div>
              <span className="font-display font-bold text-xl text-white">PilotKids</span>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Kelajak muhandislari shu yerda boshlanadi
            </p>
            <div className="flex gap-3">
              <SocialIcon icon={Send} />
              <SocialIcon icon={Share2} />
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Platforma</h4>
            <ul className="space-y-2 text-sm">
              <li><FooterLink to="/courses">Kurslar</FooterLink></li>
              <li><FooterLink to="/subscription">Obuna</FooterLink></li>
              <li><FooterLink to="/ranking">Reyting</FooterLink></li>
              <li><FooterLink href="/#faq">FAQ</FooterLink></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Kompaniya</h4>
            <ul className="space-y-2 text-sm">
              <li><FooterLink href="/#about">Biz haqimizda</FooterLink></li>
              <li><FooterLink href="#">Hamkorlik</FooterLink></li>
              <li><FooterLink href="#">Karyera</FooterLink></li>
              <li><FooterLink href="#">Blog</FooterLink></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Aloqa</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 group">
                <Mail className="w-4 h-4 text-sky transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
                info@pilotkids.uz
              </li>
              <li className="flex items-center gap-2 group">
                <Phone className="w-4 h-4 text-sky transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
                +998 90 123 45 67
              </li>
              <li className="flex items-center gap-2 group">
                <MapPin className="w-4 h-4 text-sky transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
                Toshkent, O'zbekiston
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} PilotKids. Barcha huquqlar himoyalangan.</p>
          <div className="flex gap-6">
            <FooterLink href="#">Maxfiylik</FooterLink>
            <FooterLink href="#">Shartlar</FooterLink>
          </div>
        </div>
      </div>
    </footer>
  )
}
