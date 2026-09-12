import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCommentDots } from '@fortawesome/free-solid-svg-icons'

function HuddleLogo({ className = 'text-plum' }) {
  return <FontAwesomeIcon icon={faCommentDots} className={className} aria-hidden="true" />
}

export default HuddleLogo
