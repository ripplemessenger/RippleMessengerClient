import { TxResult } from "../lib/RippleConst"

const SubmitResult = ({ result }) => {
  return (
    <div className="justify-center items-center">
      {
        result !== null &&
        <div className="flex justify-center bg-gradient-card dark:bg-dark-gradient-card p-6 rounded-xl shadow-gold-lg w-96 border border-primary/20 dark:border-primary/30">
          {
            result === TxResult.Success ?
              <span className='text-3xl font-bold text-status-success dark:text-status-success-dark'>
                SUCCESS
              </span>
              :
              <span className='text-3xl font-bold text-status-error dark:text-status-error-dark'>
                {result}
              </span>
          }
        </div>
      }
    </div>
  )
}

export default SubmitResult